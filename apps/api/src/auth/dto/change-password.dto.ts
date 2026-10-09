import { IsString, Length } from 'class-validator';

export class ChangePasswordDto {
  @IsString({ message: '请输入当前密码' })
  @Length(8, 72, { message: '当前密码长度必须为 8 到 72 位' })
  currentPassword!: string;

  @IsString({ message: '请输入新密码' })
  @Length(8, 72, { message: '新密码长度必须为 8 到 72 位' })
  password!: string;
}
