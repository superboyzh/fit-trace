import type { ApiResponse, UploadResult } from '@fit-trace/shared';
import { http } from './http';
import { prepareImageFile } from '@/utils/prepare-image';

export async function uploadImage(file: File): Promise<UploadResult> {
  const prepared = await prepareImageFile(file);
  const formData = new FormData();
  formData.append('file', prepared);
  const response = await http.post<ApiResponse<UploadResult>>('/uploads', formData, {
    timeout: 30_000,
  });
  return response.data.data;
}
