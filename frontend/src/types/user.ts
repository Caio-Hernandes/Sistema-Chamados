export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

export type UserRole = "USER" | "ADMIN";

export interface UserRead {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  created_at: string;
}