import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LocalStorageProvider } from './local-storage.provider';
import { STORAGE_PROVIDER } from './storage.types';

/**
 * 按 STORAGE_PROVIDER 选择具体实现，业务代码只依赖 StorageProvider 接口。
 */
@Global()
@Module({
  providers: [
    LocalStorageProvider,
    {
      provide: STORAGE_PROVIDER,
      inject: [ConfigService, LocalStorageProvider],
      useFactory: (config: ConfigService, local: LocalStorageProvider) => {
        const provider = config.get<string>('STORAGE_PROVIDER', 'local');
        if (provider === 'local') return local;
        throw new Error(`不支持的 STORAGE_PROVIDER：${provider}`);
      },
    },
  ],
  exports: [STORAGE_PROVIDER, LocalStorageProvider],
})
export class StorageModule {}
