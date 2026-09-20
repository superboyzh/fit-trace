import { IsDateString, IsIn, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import type { PhotoType } from '@fit-trace/shared';

export const PHOTO_TYPES: PhotoType[] = ['FRONT', 'SIDE', 'BACK', 'OTHER'];

export class CreateProgressPhotoDto {
  @IsIn(PHOTO_TYPES, { message: '请选择正确的照片类型' })
  type!: PhotoType;

  @IsString({ message: '请先上传照片' })
  @MaxLength(500, { message: '照片地址过长' })
  @Matches(/^https?:\/\//i, { message: '照片地址格式不正确' })
  imageUrl!: string;

  @IsOptional()
  @IsDateString({}, { message: '记录时间格式不正确' })
  recordedAt?: string;

  @IsOptional()
  @IsString({ message: '备注格式不正确' })
  @MaxLength(500, { message: '备注不能超过 500 个字符' })
  note?: string;
}
