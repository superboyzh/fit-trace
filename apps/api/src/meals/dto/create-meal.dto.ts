import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import type { MealType } from '@fit-trace/shared';

export class FoodItemInputDto {
  @IsString({ message: '请输入食物名称' })
  @IsNotEmpty({ message: '请输入食物名称' })
  @MaxLength(100, { message: '食物名称不能超过 100 个字符' })
  name!: string;

  @IsOptional()
  @IsString({ message: '食物份量格式不正确' })
  @MaxLength(50, { message: '食物份量不能超过 50 个字符' })
  amount?: string;

  @Type(() => Number)
  @IsOptional()
  @IsInt({ message: '热量必须为整数' })
  @Min(0, { message: '热量不能小于 0' })
  @Max(100000, { message: '热量数值过大' })
  calories?: number;
}

export class CreateMealDto {
  @IsIn(['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'], { message: '请选择正确的餐次' })
  type!: MealType;

  @IsOptional()
  @IsDateString({}, { message: '记录时间格式不正确' })
  recordedAt?: string;

  @IsOptional()
  @IsString({ message: '备注格式不正确' })
  @MaxLength(500, { message: '备注不能超过 500 个字符' })
  note?: string;

  @IsArray({ message: '请添加食物' })
  @ArrayMinSize(1, { message: '至少添加一种食物' })
  @ArrayMaxSize(50, { message: '单次最多添加 50 种食物' })
  @ValidateNested({ each: true })
  @Type(() => FoodItemInputDto)
  foods!: FoodItemInputDto[];
}
