import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class DashboardQueryDto {
  /** UTC 以东为正，单位为分钟。 */
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(-720)
  @Max(840)
  tzOffset = 480;
}
