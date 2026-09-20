import { randomUUID } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { isAbsolute, join, relative, resolve } from 'node:path';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { StorageProvider, StorageUploadOptions, StorageUploadResult } from './storage.types';

/**
 * 开发环境使用的本地磁盘存储。
 * 目录与访问前缀都来自环境变量，方便后续替换为对象存储。
 */
@Injectable()
export class LocalStorageProvider implements StorageProvider {
  private readonly logger = new Logger(LocalStorageProvider.name);
  private readonly rootDirectory: string;
  private readonly publicBaseUrl: string;
  private readonly publicPrefix: string;

  constructor(private readonly config: ConfigService) {
    this.rootDirectory = resolve(
      this.config.get<string>('STORAGE_LOCAL_DIR', join(process.cwd(), '.uploads')),
    );
    this.publicPrefix = this.normalizePrefix(
      this.config.get<string>('STORAGE_PUBLIC_PREFIX', '/uploads'),
    );
    this.publicBaseUrl = (
      this.config.get<string>('STORAGE_PUBLIC_URL') ??
      `http://localhost:${this.config.get<number>('API_PORT', 3000)}`
    ).replace(/\/+$/, '');
  }

  get directory(): string {
    return this.rootDirectory;
  }

  get prefix(): string {
    return this.publicPrefix;
  }

  async upload(file: Buffer, options: StorageUploadOptions = {}): Promise<StorageUploadResult> {
    const directory = this.sanitizeSegment(options.directory ?? 'general');
    const extension = this.sanitizeExtension(options.extension);
    const key = `${directory}/${randomUUID()}${extension}`;
    const target = join(this.rootDirectory, key);

    await mkdir(join(this.rootDirectory, directory), { recursive: true });
    await writeFile(target, file);

    return { key, url: this.toPublicUrl(key) };
  }

  async delete(key: string): Promise<void> {
    const target = this.resolveKey(key);
    if (!target) {
      this.logger.warn(`拒绝删除非法存储路径：${key}`);
      return;
    }
    await rm(target, { force: true });
  }

  async deleteByUrl(url: string): Promise<void> {
    const marker = `${this.publicPrefix}/`;
    const index = url.indexOf(marker);
    if (index === -1) return;
    const key = url.slice(index + marker.length).split('?')[0];
    if (key) await this.delete(key);
  }

  toPublicUrl(key: string): string {
    return `${this.publicBaseUrl}${this.publicPrefix}/${key}`;
  }

  private resolveKey(key: string): string | null {
    const target = resolve(this.rootDirectory, key);
    const relativePath = relative(this.rootDirectory, target);
    if (!relativePath || relativePath.startsWith('..') || isAbsolute(relativePath)) {
      return null;
    }
    return target;
  }

  private sanitizeSegment(segment: string): string {
    return segment.replace(/[^a-zA-Z0-9_-]/g, '') || 'general';
  }

  private sanitizeExtension(extension?: string): string {
    if (!extension) return '';
    const normalized = extension.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    return normalized ? `.${normalized}` : '';
  }

  private normalizePrefix(prefix: string): string {
    const trimmed = prefix.trim().replace(/^\/+|\/+$/g, '');
    return trimmed ? `/${trimmed}` : '';
  }
}
