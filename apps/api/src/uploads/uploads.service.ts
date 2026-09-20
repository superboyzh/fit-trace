import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { STORAGE_PROVIDER, type StorageProvider } from '../providers/storage/storage.types';
import type { UploadedImageFile } from './uploads.types';

export const MAX_IMAGE_SIZE = 6 * 1024 * 1024;

const IMAGE_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
};

@Injectable()
export class UploadsService {
  constructor(@Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider) {}

  async saveImage(userId: string, file?: UploadedImageFile): Promise<{ url: string; key: string }> {
    if (!file) {
      throw new BadRequestException({ code: 'FILE_REQUIRED', message: '请选择要上传的图片' });
    }
    const extension = IMAGE_EXTENSIONS[file.mimetype];
    if (!extension) {
      throw new BadRequestException({
        code: 'UNSUPPORTED_IMAGE_TYPE',
        message: '仅支持 JPG、PNG、WebP 或 HEIC 图片',
      });
    }
    if (file.size > MAX_IMAGE_SIZE) {
      throw new BadRequestException({
        code: 'IMAGE_TOO_LARGE',
        message: '图片不能超过 6 MB',
      });
    }

    return this.storage.upload(file.buffer, {
      directory: userId,
      extension,
      contentType: file.mimetype,
    });
  }

  /** 仅在文件属于当前存储层时清理，失败不影响主流程。 */
  async removeByUrl(url: string): Promise<void> {
    try {
      await this.storage.deleteByUrl(url);
    } catch {
      // 图片可能已不存在，删除失败不阻断业务。
    }
  }
}
