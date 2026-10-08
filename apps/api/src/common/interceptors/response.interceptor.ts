import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import type { ApiListMeta, ApiPayload, ApiResponse } from '@fit-trace/shared';
import type { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

type ControllerPayload = ApiPayload<unknown> & { meta?: ApiListMeta };

@Injectable()
export class ResponseInterceptor implements NestInterceptor<
  ControllerPayload,
  ApiResponse<unknown>
> {
  intercept(
    _context: ExecutionContext,
    next: CallHandler<ControllerPayload>,
  ): Observable<ApiResponse<unknown>> {
    return next.handle().pipe(
      map((payload) => ({
        code: 'OK' as const,
        message: '请求成功',
        data: payload.data ?? null,
        meta: payload.meta ?? null,
      })),
    );
  }
}
