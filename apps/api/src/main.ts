import { BadRequestException, Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { ValidationError } from 'class-validator';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { AppLogger } from './common/logger/app-logger';
import { LocalStorageProvider } from './providers/storage/local-storage.provider';

function getValidationMessage(errors: ValidationError[]): string {
  for (const error of errors) {
    if (error.constraints?.whitelistValidation) {
      return '请求中包含不支持的字段';
    }
    const message = error.constraints ? Object.values(error.constraints)[0] : undefined;
    if (message) return message;
    if (error.children?.length) {
      const childMessage = getValidationMessage(error.children);
      if (childMessage) return childMessage;
    }
  }
  return '请求参数不正确';
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: new AppLogger(),
  });
  const config = app.get(ConfigService);

  app.setGlobalPrefix('api/v1');
  app.enableCors();

  // 本地存储实现下，把上传目录以静态资源方式暴露给 H5。
  let storageDirectory = '未启用本地存储';
  if (config.get<string>('STORAGE_PROVIDER', 'local') === 'local') {
    const storage = app.get(LocalStorageProvider);
    app.useStaticAssets(storage.directory, { prefix: `${storage.prefix}/` });
    storageDirectory = storage.directory;
  }

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      exceptionFactory: (errors: ValidationError[]) =>
        new BadRequestException({
          code: 'VALIDATION_ERROR',
          message: getValidationMessage(errors),
        }),
    }),
  );

  const port = config.get<number>('API_PORT', 3000);
  await app.listen(port);

  const logger = new Logger('Bootstrap');
  logger.log(`服务已启动 http://localhost:${port}/api/v1`);
  logger.log(`图片存储目录 ${storageDirectory}`);
  logger.log(
    `饮食识别 ${config.get<string>('AI_PROVIDER', 'mock')} · ${config.get<string>('AI_MODEL', '-')} · ${config.get<string>('AI_API_MODE', 'responses')}`,
  );
}

void bootstrap();
