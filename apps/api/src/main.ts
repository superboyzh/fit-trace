import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { ValidationError } from 'class-validator';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

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
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.setGlobalPrefix('api/v1');
  app.enableCors();
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
