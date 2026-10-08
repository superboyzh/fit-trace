import { Controller, Get } from '@nestjs/common';
import type { ApiPayload, HealthStatus } from '@fit-trace/shared';

@Controller('health')
export class HealthController {
  @Get()
  check(): ApiPayload<HealthStatus> {
    return { data: { status: 'ok' } };
  }
}
