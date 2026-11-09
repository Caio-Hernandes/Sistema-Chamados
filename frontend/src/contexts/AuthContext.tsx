
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { authService } from "../services/authService";
import { userService } from "../services/userService";
import { apiRequest, ApiError } from "../services/api";

type User = Awaited<ReturnType<typeof userService.me>>;
type LoginCredentials = Parameters<typeof authService.login>[0];

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  authRequest: <T>(
    endpoint: string,
    options?: RequestInit
  ) => Promise<T>;
}

const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

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
  const [user, setUser] = useState<User | null>(null);
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

        const currentUser = await userService.me(
          tokens.access_token
        );

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
        const currentUser = await userService.me(
          tokens.access_token
        );

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
        if (
          !(error instanceof ApiError) ||
          error.status !== 401
        ) {
          throw error;
        }
      }

      let newToken: string;

      try {
        const tokens = await authService.refresh();

        newToken = tokens.access_token;
        tokenRef.current = newToken;
      } catch (error) {
        clearSession();
        throw error;
      }

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

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth deve ser usado dentro de AuthProvider."
    );
  }

  return context;
}
