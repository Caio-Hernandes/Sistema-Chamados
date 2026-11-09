import { apiRequest } from "./api";

import type {
  LoginCredentials,
  TokenResponse,
} from "../types/auth";

let refreshPromise: Promise<TokenResponse> | null = null;

export const authService = {
  async login(credentials: LoginCredentials): Promise<TokenResponse> {
    const formData = new URLSearchParams();

    formData.append("username", credentials.email);
    formData.append("password", credentials.password);

    return apiRequest<TokenResponse>("/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData,
    });
  },

  refresh(): Promise<TokenResponse> {
    if (!refreshPromise) {
      refreshPromise = apiRequest<TokenResponse>("/auth/refresh", {
        method: "POST",
        headers: {
          "X-CSRF-Protection": "1",
        },
      }).finally(() => {
        refreshPromise = null;
      });
    }

    return refreshPromise;
  },

  async logout(): Promise<void> {
    return apiRequest<void>("/auth/logout", {
      method: "POST",
      headers: {
        "X-CSRF-Protection": "1",
      },
    });
  },
};