import { Transform } from 'class-transformer';
import { IsEmail, IsString, Length } from 'class-validator';

export class LoginDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail({}, { message: '请输入正确的邮箱地址' })
  email!: string;

  @IsString({ message: '密码格式不正确' })
  @Length(8, 72, { message: '密码长度必须为 8 到 72 位' })
  password!: string;
}
