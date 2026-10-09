import type { UserGender } from '@fit-trace/shared';
import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, IsUrl, Length, MaxLength, ValidateIf } from 'class-validator';

export class UpdateProfileDto {
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @ValidateIf((_object: unknown, value: unknown) => value !== undefined)
  @IsString({ message: '昵称格式不正确' })
  @Length(1, 40, { message: '昵称长度必须为 1 到 40 个字符' })
  nickname?: string;

  @ValidateIf((_object: unknown, value: unknown) => value !== undefined)
  @IsIn(['UNSPECIFIED', 'MALE', 'FEMALE'], { message: '请选择正确的性别' })
  gender?: UserGender;

  @IsOptional()
  @IsUrl(
    { protocols: ['http', 'https'], require_protocol: true, require_tld: false },
    { message: '头像地址格式不正确' },
  )
  @MaxLength(2048, { message: '头像地址过长' })
  avatarUrl?: string | null;
}
