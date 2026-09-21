import type { ApiResponse, FitnessGoalType, PublicUser } from '@fit-trace/shared';
import { http } from './http';

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
