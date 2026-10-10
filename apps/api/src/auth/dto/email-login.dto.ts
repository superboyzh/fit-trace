import { Transform } from 'class-transformer';
import { Equals, IsEmail, IsString, Matches } from 'class-validator';

export class EmailLoginDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail({}, { message: '请输入正确的邮箱地址' })
  email!: string;

  @IsString({ message: '请输入邮箱验证码' })
  @Matches(/^\d{6}$/, { message: '请输入 6 位邮箱验证码' })
  emailCode!: string;

  @Equals(true, { message: '请先阅读并同意用户协议和隐私政策' })
  acceptedTerms!: boolean;
}
