import type { ApiResponse, FoodRecognitionResult } from '@fit-trace/shared';
import { http } from './http';

export async function recognizeFood(imageUrl: string): Promise<FoodRecognitionResult> {
  const response = await http.post<ApiResponse<FoodRecognitionResult>>(
    '/ai/food-recognition',
    { imageUrl },
    { timeout: 60_000 },
  );
  return response.data.data;
}
