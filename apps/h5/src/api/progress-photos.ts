import type { ApiListResponse, ApiResponse, PhotoType, ProgressPhoto } from '@fit-trace/shared';
import { http } from './http';

export interface ProgressPhotoInput {
  type: PhotoType;
  imageUrl: string;
  recordedAt?: string;
  note?: string;
}

export interface ProgressPhotoListParams {
  page?: number;
  pageSize?: number;
  type?: PhotoType;
}

export async function getProgressPhotos(
  params: ProgressPhotoListParams = {},
): Promise<ApiListResponse<ProgressPhoto>> {
  const response = await http.get<ApiListResponse<ProgressPhoto>>('/progress-photos', { params });
  return response.data;
}

export async function createProgressPhoto(input: ProgressPhotoInput): Promise<ProgressPhoto> {
  const response = await http.post<ApiResponse<ProgressPhoto>>('/progress-photos', input);
  return response.data.data;
}

export async function deleteProgressPhoto(id: string): Promise<void> {
  await http.delete(`/progress-photos/${id}`);
}
