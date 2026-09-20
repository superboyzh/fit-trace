import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class FoodRecognitionDto {
  @IsString({ message: '请先上传餐食照片' })
  @MaxLength(500, { message: '图片地址过长' })
  @Matches(/^https?:\/\//i, { message: '图片地址格式不正确' })
  imageUrl!: string;

  /** 用户对识别结果的更正说明，例如“左边那碗是鸡蛋羹”。 */
  @IsOptional()
  @IsString({ message: '纠正说明格式不正确' })
  @MaxLength(200, { message: '纠正说明不能超过 200 个字符' })
  hint?: string;
}
