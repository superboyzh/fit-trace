import { IsString, Matches } from 'class-validator';

export class RefreshSessionDto {
  @IsString()
  @Matches(/^[a-f0-9]{64}$/, { message: '登录会话凭证格式不正确' })
  refreshToken!: string;
}
