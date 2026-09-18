import type { ApiResponse, AuthResult, PublicUser } from '@fit-trace/shared';
import { http } from './http';

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput extends LoginInput {
  nickname?: string;
}

export async function login(input: LoginInput): Promise<AuthResult> {
  const response = await http.post<ApiResponse<AuthResult>>('/auth/login', input);
  return response.data.data;
}

export async function register(input: RegisterInput): Promise<AuthResult> {
  const response = await http.post<ApiResponse<AuthResult>>('/auth/register', input);
  return response.data.data;
}

export async function getCurrentUser(): Promise<PublicUser> {
  const response = await http.get<ApiResponse<PublicUser>>('/auth/me');
  return response.data.data;
}
