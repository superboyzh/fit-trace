import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import type { MealType } from '@fit-trace/shared';
import { FoodItemInputDto } from './create-meal.dto';

export class UpdateMealDto {
  @IsOptional()
  @IsIn(['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'], { message: '请选择正确的餐次' })
  type?: MealType;

  @IsOptional()
  @IsDateString({}, { message: '记录时间格式不正确' })
  recordedAt?: string;

  @IsOptional()
  @IsString({ message: '备注格式不正确' })
  @MaxLength(500, { message: '备注不能超过 500 个字符' })
  note?: string;

  @IsOptional()
  @IsString({ message: '餐食照片格式不正确' })
  @MaxLength(500, { message: '餐食照片地址过长' })
  @Matches(/^https?:\/\//i, { message: '餐食照片地址格式不正确' })
  imageUrl?: string;

  @IsOptional()
  @IsArray({ message: '请添加食物' })
  @ArrayMinSize(1, { message: '至少添加一种食物' })
  @ArrayMaxSize(50, { message: '单次最多添加 50 种食物' })
  @ValidateNested({ each: true })
  @Type(() => FoodItemInputDto)
  foods?: FoodItemInputDto[];
}
