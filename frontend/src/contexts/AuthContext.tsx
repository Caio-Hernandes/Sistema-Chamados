import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import type { ReactNode } from "react";

import { apiRequest, ApiError } from "../services/api";
import { authService } from "../services/authService";
import { userService } from "../services/userService";

import type { LoginCredentials } from "../types/auth";
import type { UserRead } from "../types/user";

interface AuthContextType {
  user: UserRead | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  authRequest: <T>(
    endpoint: string,
    options?: RequestInit
  ) => Promise<T>;
}

const AuthContext = createContext<AuthContextType | null>(null);

function withBearer(
  options: RequestInit,
  token: string
): RequestInit {
  const headers = new Headers(options.headers);

  headers.set("Authorization", `Bearer ${token}`);

  return {
    ...options,
    headers,
  };
}

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [user, setUser] = useState<UserRead | null>(null);
  const [loading, setLoading] = useState(true);

  const tokenRef = useRef<string | null>(null);

  const clearSession = useCallback(() => {
    tokenRef.current = null;
    setUser(null);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      try {
        const tokens = await authService.refresh();
        const currentUser = await userService.me(tokens.access_token);

        if (!cancelled) {
          tokenRef.current = tokens.access_token;
          setUser(currentUser);
        }
      } catch {
        if (!cancelled) {
          clearSession();
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void restoreSession();

    return () => {
      cancelled = true;
    };
  }, [clearSession]);

  const login = useCallback(
    async (credentials: LoginCredentials) => {
      const tokens = await authService.login(credentials);

      tokenRef.current = tokens.access_token;

      try {
        const currentUser = await userService.me(tokens.access_token);
        setUser(currentUser);
      } catch (error) {
        clearSession();
        throw error;
      }
    },
    [clearSession]
  );

  const logout = useCallback(async () => {
    await authService.logout();
    clearSession();
  }, [clearSession]);

 
const authRequest = useCallback(
  async <T,>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> => {
    const token = tokenRef.current;

    if (!token) {
      throw new Error("Usuário não autenticado.");
    }

    try {
      return await apiRequest<T>(
        endpoint,
        withBearer(options, token)
      );
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 401) {
        throw error;
      }
    }

    // O access token pode ter expirado.
    // Tentamos renovar a sessão.
    let newToken: string;

    try {
      const tokens = await authService.refresh();

      newToken = tokens.access_token;
      tokenRef.current = newToken;
    } catch (error) {
      // Só limpa a sessão se o refresh falhar.
      clearSession();
      throw error;
    }

    // Repete a requisição com o token renovado.
    // Um erro aqui não será confundido com falha do refresh.
    return apiRequest<T>(
      endpoint,
      withBearer(options, newToken)
    );
  },
  [clearSession]
);


  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: user !== null,
        login,
        logout,
        authRequest,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider.");
  }

  return context;
}