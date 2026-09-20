import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
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
  private readonly logger = new Logger('Uploads');

  constructor(@Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider) {}

  async saveImage(userId: string, file?: UploadedImageFile): Promise<{ url: string; key: string }> {
    if (!file) {
      this.logger.warn('上传失败：没有收到文件');
      throw new BadRequestException({ code: 'FILE_REQUIRED', message: '请选择要上传的图片' });
    }
    if (isHeic(file.buffer)) {
      this.logger.warn(
        `上传被拒 user=${this.short(userId)} 原因=HEIC mimetype=${file.mimetype} 大小=${this.kb(file.size)}`,
      );
      throw new BadRequestException({
        code: 'UNSUPPORTED_IMAGE_TYPE',
        message: UNSUPPORTED_MESSAGE,
      });
    }
    const extension = IMAGE_EXTENSIONS[file.mimetype];
    if (!extension) {
      this.logger.warn(
        `上传被拒 user=${this.short(userId)} 原因=不支持的类型 mimetype=${file.mimetype} 大小=${this.kb(file.size)}`,
      );
      throw new BadRequestException({
        code: 'UNSUPPORTED_IMAGE_TYPE',
        message: UNSUPPORTED_MESSAGE,
      });
    }
    if (file.size > MAX_IMAGE_SIZE) {
      this.logger.warn(
        `上传被拒 user=${this.short(userId)} 原因=超出大小限制 大小=${this.kb(file.size)}`,
      );
      throw new BadRequestException({
        code: 'IMAGE_TOO_LARGE',
        message: '图片不能超过 6 MB',
      });
    }

    const result = await this.storage.upload(file.buffer, {
      directory: userId,
      extension,
      contentType: file.mimetype,
    });
    this.logger.log(
      `图片已保存 user=${this.short(userId)} 类型=${file.mimetype} 大小=${this.kb(file.size)} key=${result.key}`,
    );
    return result;
  }

  /** 仅在文件属于当前存储层时清理，失败不影响主流程。 */
  async removeByUrl(url: string): Promise<void> {
    try {
      await this.storage.deleteByUrl(url);
      this.logger.log(`已清理存储文件 ${url}`);
    } catch {
      this.logger.warn(`存储文件清理失败 ${url}`);
      // 图片可能已不存在，删除失败不阻断业务。
    }
  }

  private short(id: string): string {
    return id.slice(0, 8);
  }

  private kb(size: number): string {
    return `${Math.round(size / 1024)}KB`;
  }
}
