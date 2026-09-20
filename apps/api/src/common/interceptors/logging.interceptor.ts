import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import type { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import type { JwtPayload } from '../../auth/auth.types';

interface LoggedRequest extends Request {
  user?: JwtPayload;
}

/**
 * 每个请求留一行记录：方法、路径、状态码、耗时、用户。
 * 出错时带上业务错误码，方便直接定位是哪一步失败。
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<LoggedRequest>();
    const response = http.getResponse<Response>();
    const startedAt = Date.now();
    const { method } = request;
    const path = request.originalUrl.split('?')[0];
    const user = this.describeUser(request);

    return next.handle().pipe(
      tap({
        next: () => {
          this.logger.log(
            `${method} ${path} ${response.statusCode} ${Date.now() - startedAt}ms${user}`,
          );
        },
        error: (error: unknown) => {
          const status = error instanceof HttpException ? error.getStatus() : 500;
          const detail = this.describeError(error);
          const line = `${method} ${path} ${status} ${Date.now() - startedAt}ms${user}${detail}`;
          if (status >= 500) this.logger.error(line);
          else this.logger.warn(line);
        },
      }),
    );
  }

  private describeUser(request: LoggedRequest): string {
    const id = request.user?.sub;
    return id ? ` user=${id.slice(0, 8)}` : '';
  }

  private describeError(error: unknown): string {
    if (error instanceof HttpException) {
      const payload = error.getResponse();
      if (typeof payload === 'string') return ` ${payload}`;
      const record = payload as { code?: string; message?: string };
      return ` ${record.code ?? error.getStatus()}:${record.message ?? ''}`;
    }
    if (error instanceof Error) return ` ${error.name}:${error.message}`;
    return ' 未知错误';
  }
}
