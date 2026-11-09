import { apiRequest } from "./api";
import type { RegisterPayload, UserRead } from "../types/user";

export const userService = {
  async register(data: RegisterPayload): Promise<UserRead> {
    return apiRequest<UserRead>("/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
  },

  async me(accessToken: string): Promise<UserRead> {
    return apiRequest<UserRead>("/users/me", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  },
};