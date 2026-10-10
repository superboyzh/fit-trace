import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import type { EmailCaptchaPlatform } from '@fit-trace/shared';

export class EmailCaptchaDto {
  @IsOptional()
  @IsString({ message: '安全验证参数不正确，请重新验证' })
  @MinLength(1, { message: '请先完成安全验证' })
  @MaxLength(32768, { message: '安全验证参数不正确，请重新验证' })
  captchaVerifyParam?: string;

  @IsOptional()
  @IsIn(['web', 'app'], { message: '安全验证客户端类型不正确' })
  captchaPlatform?: EmailCaptchaPlatform;
}
