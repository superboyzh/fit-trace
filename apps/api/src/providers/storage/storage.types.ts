export interface StorageUploadOptions {
  /** 存储子目录，用于按用户隔离文件。 */
  directory?: string;
  /** 文件扩展名，例如 jpg。 */
  extension?: string;
  contentType?: string;
}

export interface StorageUploadResult {
  /** 存储层内部标识，删除文件时使用。 */
  key: string;
  /** 可直接访问的绝对地址。 */
  url: string;
}

export interface StorageProvider {
  upload(file: Buffer, options?: StorageUploadOptions): Promise<StorageUploadResult>;
  delete(key: string): Promise<void>;
  /** 按公开地址删除文件；地址不属于当前存储层时静默跳过。 */
  deleteByUrl(url: string): Promise<void>;
  /**
   * 返回可交给外部服务读取的图片引用。
   * 本地存储的文件无法被第三方服务访问，需要转成 base64 data URL。
   */
  resolveExternalRef(url: string): Promise<string>;
}

export const STORAGE_PROVIDER = Symbol('STORAGE_PROVIDER');
