import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { STORAGE_PROVIDER, type StorageProvider } from '../providers/storage/storage.types';
import type { UploadedImageFile } from './uploads.types';

export const MAX_IMAGE_SIZE = 6 * 1024 * 1024;

const IMAGE_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const UNSUPPORTED_MESSAGE =
  '仅支持 JPG、PNG 或 WebP 图片。iPhone 的 HEIC 照片请在“设置 → 相机 → 格式”里改为“兼容性最佳”，或先导出为 JPEG 再上传。';

/** HEIC/HEIF 无法被识别服务和浏览器直接使用，这里按文件头拦截。 */
function isHeic(buffer: Buffer): boolean {
  if (buffer.length < 12) return false;
  if (buffer.toString('ascii', 4, 8) !== 'ftyp') return false;
  const brand = buffer.toString('ascii', 8, 12);
  return ['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'hevm', 'hevs', 'mif1', 'msf1'].includes(
    brand,
  );
}

@Injectable()
export class UploadsService {
  constructor(@Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider) {}

  async saveImage(userId: string, file?: UploadedImageFile): Promise<{ url: string; key: string }> {
    if (!file) {
      throw new BadRequestException({ code: 'FILE_REQUIRED', message: '请选择要上传的图片' });
    }
    if (isHeic(file.buffer)) {
      throw new BadRequestException({
        code: 'UNSUPPORTED_IMAGE_TYPE',
        message: UNSUPPORTED_MESSAGE,
      });
    }
    const extension = IMAGE_EXTENSIONS[file.mimetype];
    if (!extension) {
      throw new BadRequestException({
        code: 'UNSUPPORTED_IMAGE_TYPE',
        message: UNSUPPORTED_MESSAGE,
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
