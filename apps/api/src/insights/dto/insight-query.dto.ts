import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import type { InsightDays } from '@fit-trace/shared';

export class InsightQueryDto {
  @Type(() => Number)
  @IsIn([7, 30, 90], { message: '分析范围只能是 7、30 或 90 天' })
  days: InsightDays = 30;

  /** 相对于 UTC 的分钟偏移，东八区为 480。 */
  @Type(() => Number)
  @IsOptional()
  @IsInt({ message: '时区偏移必须为整数' })
  @Min(-720, { message: '时区偏移超出范围' })
  @Max(840, { message: '时区偏移超出范围' })
  tzOffset = 480;
}
