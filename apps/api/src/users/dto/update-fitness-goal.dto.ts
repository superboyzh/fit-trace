import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsNumber, IsOptional, Max, Min } from 'class-validator';

export enum FitnessGoalTypeDto {
  LOSE_FAT = 'LOSE_FAT',
  GAIN_MUSCLE = 'GAIN_MUSCLE',
  MAINTAIN = 'MAINTAIN',
}

export class UpdateFitnessGoalDto {
  @IsEnum(FitnessGoalTypeDto, { message: '请选择正确的目标类型' })
  type!: FitnessGoalTypeDto;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: '请输入正确的目标体重' })
  @Min(1, { message: '目标体重必须大于 0' })
  @Max(500, { message: '目标体重不能超过 500 kg' })
  targetWeight!: number;

  @IsOptional()
  @IsDateString({}, { message: '目标日期格式不正确' })
  targetDate?: string;

  @Type(() => Number)
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 }, { message: '请输入正确的当前体重' })
  @Min(1, { message: '当前体重必须大于 0' })
  @Max(500, { message: '当前体重不能超过 500 kg' })
  currentWeight?: number;
}
