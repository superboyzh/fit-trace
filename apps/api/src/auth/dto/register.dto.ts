import { Transform } from 'class-transformer';
import { IsEmail, IsOptional, IsString, Length, MaxLength } from 'class-validator';

export class RegisterDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail({}, { message: '请输入正确的邮箱地址' })
  email!: string;

  @IsString({ message: '密码格式不正确' })
  @Length(8, 72, { message: '密码长度必须为 8 到 72 位' })
  password!: string;

  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString({ message: '昵称格式不正确' })
  @MaxLength(40, { message: '昵称不能超过 40 个字符' })
  nickname?: string;
}
