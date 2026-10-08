import { ForbiddenException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { UsersService, type PublicUser } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { VerifyResetCodeDto } from './dto/verify-reset-code.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { AuthSecurityService } from './auth-security.service';
import { EmailVerificationService } from './email-verification.service';
import type { AuthResult, JwtPayload } from './auth.types';

@Injectable()
export class AuthService {
  private readonly logger = new Logger('Auth');

  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly security: AuthSecurityService,
    private readonly verification: EmailVerificationService,
  ) {}

  async register(dto: RegisterDto, ip: string): Promise<AuthResult> {
    await this.security.limit('register-ip', ip, 20, 3600);
    const passwordHash = await hash(dto.password, 12);
    const user = await this.verification.withCode(dto.email, 'REGISTER', dto.emailCode, (tx) =>
      this.users.create(
        {
          email: dto.email,
          passwordHash,
          ...(dto.nickname ? { nickname: dto.nickname } : {}),
        },
        tx,
      ),
    );

    this.logger.log(`注册成功 email=${user.email} user=${user.id.slice(0, 8)}`);
    return this.buildAuthResult(user);
  }

  async login(dto: LoginDto, ip: string): Promise<AuthResult> {
    await this.security.limit('login-ip', ip, 40, 900);
    await this.security.limit('login-email', dto.email, 20, 900);
    if (await this.security.needsCaptcha(dto.email, ip)) {
      await this.security.verifyCaptcha(dto.captchaId, dto.captchaCode, ip);
    }
    const user = await this.users.findByEmail(dto.email);
    // 不存在的账户也执行密码比较，降低账户存在性时序差异。
    const passwordHash = user?.passwordHash ?? (await this.dummyPasswordHash());
    if (!(await compare(dto.password, passwordHash)) || !user) {
      await this.security.loginFailed(dto.email, ip);
      this.logger.warn(`登录失败 email=${dto.email} 原因=${user ? '密码错误' : '邮箱不存在'}`);
      if (await this.security.needsCaptcha(dto.email, ip)) {
        throw new ForbiddenException({
          code: 'LOGIN_CAPTCHA_REQUIRED',
          message: '邮箱或密码错误，请完成安全验证后重试',
        });
      }
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: '邮箱或密码错误',
      });
    }

    this.logger.log(`登录成功 email=${user.email} user=${user.id.slice(0, 8)}`);
    const publicUser = await this.users.findPublicById(user.id);
    if (!publicUser) {
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: '邮箱或密码错误',
      });
    }
    await this.security.loginSucceeded(dto.email, ip);
    return this.buildAuthResult(publicUser, user.tokenVersion);
  }

  async verifyResetCode(dto: VerifyResetCodeDto, ip: string) {
    await this.security.limit('reset-verify-ip', ip, 30, 900);
    await this.security.limit('reset-verify-email', dto.email, 10, 900);
    return this.verification.verifyResetCode(dto.email, dto.emailCode);
  }

  async resetPassword(dto: ResetPasswordDto, ip: string): Promise<void> {
    await this.security.limit('reset-ip', ip, 20, 3600);
    await this.security.limit('reset-email', dto.email, 10, 900);
    const passwordHash = await hash(dto.password, 12);
    await this.verification.withResetToken(dto.email, dto.resetToken, async (tx) => {
      await tx.user.update({
        where: { email: dto.email },
        data: { passwordHash, tokenVersion: { increment: 1 } },
      });
    });
    await this.security.loginSucceeded(dto.email, ip);
  }

  private dummyHash?: Promise<string>;
  private dummyPasswordHash(): Promise<string> {
    return (this.dummyHash ??= hash('fit-trace-invalid-account', 12));
  }

  private async buildAuthResult(user: PublicUser, ver = 0): Promise<AuthResult> {
    const payload: JwtPayload = { sub: user.id, email: user.email, ver };
    return { accessToken: await this.jwt.signAsync(payload), user };
  }
}
