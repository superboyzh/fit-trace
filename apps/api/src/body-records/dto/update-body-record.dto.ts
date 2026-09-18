import { Type } from 'class-transformer';
import { IsDateString, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class UpdateBodyRecordDto {
  @Type(() => Number)
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 }, { message: '请输入正确的体重' })
  @Min(1, { message: '体重必须大于 0' })
  @Max(500, { message: '体重不能超过 500 kg' })
  weight?: number;

  @Type(() => Number)
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 }, { message: '请输入正确的体脂率' })
  @Min(0, { message: '体脂率不能小于 0' })
  @Max(100, { message: '体脂率不能超过 100%' })
  bodyFat?: number;

  @Type(() => Number)
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 }, { message: '请输入正确的腰围' })
  @Min(1, { message: '腰围必须大于 0' })
  @Max(500, { message: '腰围不能超过 500 cm' })
  waist?: number;

  @Type(() => Number)
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 }, { message: '请输入正确的胸围' })
  @Min(1, { message: '胸围必须大于 0' })
  @Max(500, { message: '胸围不能超过 500 cm' })
  chest?: number;

  @Type(() => Number)
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 }, { message: '请输入正确的臀围' })
  @Min(1, { message: '臀围必须大于 0' })
  @Max(500, { message: '臀围不能超过 500 cm' })
  hip?: number;

  @IsOptional()
  @IsDateString({}, { message: '记录时间格式不正确' })
  recordedAt?: string;

  @IsOptional()
  @IsString({ message: '备注格式不正确' })
  @MaxLength(500, { message: '备注不能超过 500 个字符' })
  note?: string;
}
