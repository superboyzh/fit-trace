import { Transform } from 'class-transformer';
import { IsEmail, IsString, IsUUID, Length } from 'class-validator';

export class ResetPasswordDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail({}, { message: '请输入正确的邮箱地址' })
  email!: string;

  @IsUUID('4', { message: '请先完成邮箱验证' })
  resetToken!: string;

  @IsString({ message: '密码格式不正确' })
  @Length(8, 72, { message: '密码长度必须为 8 到 72 位' })
  password!: string;
}
