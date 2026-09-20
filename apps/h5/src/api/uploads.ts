import type { ApiResponse, UploadResult } from '@fit-trace/shared';
import { http } from './http';
import { prepareImageFile } from '@/utils/prepare-image';

export async function uploadImage(file: File): Promise<UploadResult> {
  const prepared = await prepareImageFile(file);
  if (['image/heic', 'image/heif'].includes(prepared.type.toLowerCase())) {
    throw new Error(
      '浏览器无法转换这张 HEIC 照片，请改用 JPG/PNG，或在 iPhone“设置 → 相机 → 格式”里选择“兼容性最佳”',
    );
  }
  const formData = new FormData();
  formData.append('file', prepared);
  const response = await http.post<ApiResponse<UploadResult>>('/uploads', formData, {
    timeout: 30_000,
  });
  return response.data.data;
}
