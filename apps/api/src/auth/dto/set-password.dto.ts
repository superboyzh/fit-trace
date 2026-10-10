import { IsString, Length, Matches } from 'class-validator';

export class PasswordEmailCodeDto {
  @IsString({ message: '请输入邮箱验证码' })
  @Matches(/^\d{6}$/, { message: '请输入 6 位邮箱验证码' })
  emailCode!: string;
}

export class SetPasswordDto {
  @IsString({ message: '请先验证邮箱' })
  @Length(36, 36, { message: '邮箱验证已失效，请重新验证' })
  resetToken!: string;

  @IsString({ message: '请输入新密码' })
  @Length(8, 72, { message: '密码长度必须为 8 到 72 位' })
  password!: string;
}
