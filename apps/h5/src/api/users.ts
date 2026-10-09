import type { ApiResponse, FitnessGoalType, PublicUser, UserGender } from '@fit-trace/shared';
import { http } from './http';

export interface UpdateProfileInput {
  nickname: string;
  gender: UserGender;
  avatarUrl: string | null;
}

export async function updateProfile(input: UpdateProfileInput): Promise<PublicUser> {
  const response = await http.patch<ApiResponse<PublicUser>>('/users/me/profile', input);
  return response.data.data;
}

export interface UpdateFitnessGoalInput {
  type: FitnessGoalType;
  targetWeight: number;
  targetDate?: string;
  currentWeight?: number;
}

export async function updateFitnessGoal(input: UpdateFitnessGoalInput): Promise<PublicUser> {
  const response = await http.patch<ApiResponse<PublicUser>>('/users/me/goal', input);
  return response.data.data;
}
