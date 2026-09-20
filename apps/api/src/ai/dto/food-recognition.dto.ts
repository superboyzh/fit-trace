import { IsString, Matches, MaxLength } from 'class-validator';

export class FoodRecognitionDto {
  @IsString({ message: '请先上传餐食照片' })
  @MaxLength(500, { message: '图片地址过长' })
  @Matches(/^https?:\/\//i, { message: '图片地址格式不正确' })
  imageUrl!: string;
}
