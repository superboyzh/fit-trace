import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import type { ApiErrorResponse } from '@fit-trace/shared';
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
  413: '上传文件过大',
  502: '上游服务响应异常',
  503: '服务暂时不可用，请稍后重试',
  504: '上游服务响应超时，请稍后重试',
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    if (!(exception instanceof HttpException)) {
      this.logger.error(
        '未捕获的请求异常',
        exception instanceof Error ? exception.stack : String(exception),
      );
      this.respond(response, 500, 'INTERNAL_ERROR', defaultMessages[500]);
      return;
    }
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      const body = exceptionResponse as { code?: unknown; message?: unknown };
      if (typeof body.code === 'string' && typeof body.message === 'string') {
        this.respond(response, status, body.code, body.message);
        return;
      }
      if (Array.isArray(body.message)) {
        this.respond(
          response,
          status,
          'VALIDATION_ERROR',
          body.message.find((item): item is string => typeof item === 'string') ?? '请求参数不正确',
        );
        return;
      }
      if (typeof body.message === 'string' && status < 500) {
        this.respond(response, status, `HTTP_${status}`, body.message);
        return;
      }
    }

    this.respond(
      response,
      status,
      `HTTP_${status}`,
      typeof exceptionResponse === 'string' && status < 500
        ? exceptionResponse
        : (defaultMessages[status] ?? '请求处理失败'),
    );
  }

  private respond(response: Response, status: number, code: string, message: string): void {
    const body: ApiErrorResponse = { code, message, data: null, meta: null };
    response.status(status).json(body);
  }
}
