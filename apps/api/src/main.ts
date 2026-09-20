import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { ValidationError } from 'class-validator';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
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
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);

  app.setGlobalPrefix('api/v1');
  app.enableCors();

  // 本地存储实现下，把上传目录以静态资源方式暴露给 H5。
  if (config.get<string>('STORAGE_PROVIDER', 'local') === 'local') {
    const storage = app.get(LocalStorageProvider);
    app.useStaticAssets(storage.directory, { prefix: `${storage.prefix}/` });
  }

  app.useGlobalFilters(new HttpExceptionFilter());
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

  await app.listen(config.get<number>('API_PORT', 3000));
}

void bootstrap();
