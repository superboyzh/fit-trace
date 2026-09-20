import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { UsersService, type PublicUser } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import type { AuthResult, JwtPayload } from './auth.types';

@Injectable()
export class AuthService {
  private readonly logger = new Logger('Auth');

  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResult> {
    const passwordHash = await hash(dto.password, 12);
    const user = await this.users.create({
      email: dto.email,
      passwordHash,
      ...(dto.nickname ? { nickname: dto.nickname } : {}),
    });

    this.logger.log(`注册成功 email=${user.email} user=${user.id.slice(0, 8)}`);
    return this.buildAuthResult(user);
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const user = await this.users.findByEmail(dto.email);
    if (!user || !(await compare(dto.password, user.passwordHash))) {
      this.logger.warn(`登录失败 email=${dto.email} 原因=${user ? '密码错误' : '邮箱不存在'}`);
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: '邮箱或密码错误',
      });
    }

    this.logger.log(`登录成功 email=${user.email} user=${user.id.slice(0, 8)}`);
    return this.buildAuthResult({
      id: user.id,
      email: user.email,
      nickname: user.nickname,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  }

  private async buildAuthResult(user: PublicUser): Promise<AuthResult> {
    const payload: JwtPayload = { sub: user.id, email: user.email };
    return { accessToken: await this.jwt.signAsync(payload), user };
  }
}
