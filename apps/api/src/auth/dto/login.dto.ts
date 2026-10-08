import { Transform } from 'class-transformer';
import { IsEmail, IsOptional, IsString, IsUUID, Length, Matches } from 'class-validator';

export class LoginDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail({}, { message: '请输入正确的邮箱地址' })
  email!: string;

  @IsString({ message: '密码格式不正确' })
  @Length(8, 72, { message: '密码长度必须为 8 到 72 位' })
  password!: string;

  @IsOptional()
  @IsUUID('4', { message: '图形验证码已失效，请刷新' })
  captchaId?: string;

  @IsOptional()
  @IsString({ message: '请输入图形验证码' })
  @Matches(/^[a-z\d]{4}$/i, { message: '请输入图片中的 4 位字符' })
  captchaCode?: string;
}
