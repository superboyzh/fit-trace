import type { ApiResponse, UploadResult } from '@fit-trace/shared';
import { http } from './http';

export async function uploadImage(file: File): Promise<UploadResult> {
  const formData = new FormData();
  formData.append('file', file);
  const response = await http.post<ApiResponse<UploadResult>>('/uploads', formData, {
    timeout: 30_000,
  });
  return response.data.data;
}
