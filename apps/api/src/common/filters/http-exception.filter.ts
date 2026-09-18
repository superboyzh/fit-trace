import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import type { Response } from 'express';

const defaultMessages: Record<number, string> = {
  400: '请求参数不正确',
  401: '请先登录或重新登录',
  403: '无权执行此操作',
  404: '请求的资源不存在',
  409: '请求的数据存在冲突',
  422: '请求内容无法处理',
  429: '请求过于频繁，请稍后再试',
  500: '服务器内部错误',
};

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      const body = exceptionResponse as { code?: unknown; message?: unknown };
      if (typeof body.code === 'string' && typeof body.message === 'string') {
        response.status(status).json({ code: body.code, message: body.message });
        return;
      }
      if (Array.isArray(body.message)) {
        response.status(status).json({
          code: 'VALIDATION_ERROR',
          message:
            body.message.find((item): item is string => typeof item === 'string') ??
            '请求参数不正确',
        });
        return;
      }
    }

    response.status(status).json({
      code: `HTTP_${status}`,
      message:
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : (defaultMessages[status] ?? '请求处理失败'),
    });
  }
}
