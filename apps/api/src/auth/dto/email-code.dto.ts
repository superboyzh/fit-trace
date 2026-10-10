import { Transform } from 'class-transformer';
import { IsEmail, IsIn } from 'class-validator';
import type { EmailCodePurpose } from '@fit-trace/shared';

export class EmailCodeDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail({}, { message: '请输入正确的邮箱地址' })
  email!: string;

  @IsIn(['LOGIN', 'REGISTER', 'RESET_PASSWORD'], { message: '验证码用途不正确' })
  purpose!: EmailCodePurpose;
}
