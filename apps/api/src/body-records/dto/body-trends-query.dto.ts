import { Type } from 'class-transformer';
import { IsIn } from 'class-validator';
import type { BodyTrendDays } from '@fit-trace/shared';

export class BodyTrendsQueryDto {
  @Type(() => Number)
  @IsIn([7, 30, 90], { message: '趋势范围只能是 7、30 或 90 天' })
  days: BodyTrendDays = 30;
}
