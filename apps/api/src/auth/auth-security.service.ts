import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { ForbiddenException, HttpException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EmailCodePurpose, LoginCaptcha } from '@fit-trace/shared';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { renderCaptcha } from './captcha-image';

export interface EmailCodeReservation {
  key: string;
  expiresAt: Date;
}

@Injectable()
export class AuthSecurityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  digest(value: string): string {
    const secret = this.config.get<string>('JWT_SECRET');
    if (!secret) throw new Error('缺少 JWT_SECRET 配置');
    return createHmac('sha256', secret).update(value).digest('hex');
  }
  matches(value: string, digest: string): boolean {
    const a = Buffer.from(this.digest(value), 'hex');
    const b = Buffer.from(digest, 'hex');
    return a.length === b.length && timingSafeEqual(a, b);
  }
  key(scope: string, value: string): string {
    return `${scope}:${this.digest(value)}`;
  }

  async hit(key: string, seconds: number): Promise<number> {
    return (await this.increment(key, seconds, this.prisma)).count;
  }

  private async increment(key: string, seconds: number, transaction: Prisma.TransactionClient) {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + seconds * 1000);
    const rows = await transaction.$queryRaw<Array<{ count: number; expiresAt: Date }>>`
      INSERT INTO "auth_rate_limits" ("key", "count", "expiresAt") VALUES (${key}, 1, ${expiresAt})
      ON CONFLICT ("key") DO UPDATE SET
        "count" = CASE WHEN "auth_rate_limits"."expiresAt" <= ${now} THEN 1 ELSE "auth_rate_limits"."count" + 1 END,
        "expiresAt" = CASE WHEN "auth_rate_limits"."expiresAt" <= ${now} THEN ${expiresAt} ELSE "auth_rate_limits"."expiresAt" END
      RETURNING "count", "expiresAt"
    `;
    return rows[0];
  }

  async reserveEmailCode(
    email: string,
    purpose: EmailCodePurpose,
    ip: string,
    transaction: Prisma.TransactionClient,
  ): Promise<EmailCodeReservation[]> {
    const rules = [
      { scope: 'email-code-minute', value: `${email}:${purpose}`, maximum: 1, seconds: 60 },
      { scope: 'email-code-hour', value: email, maximum: 5, seconds: 3600 },
      { scope: 'email-code-ip', value: ip, maximum: 10, seconds: 3600 },
    ];
    const reservations: EmailCodeReservation[] = [];
    for (const rule of rules) {
      const key = this.key(rule.scope, rule.value);
      const row = await this.increment(key, rule.seconds, transaction);
      if (row.count > rule.maximum) {
        const retryAfterSeconds = Math.max(
          1,
          Math.ceil((row.expiresAt.getTime() - Date.now()) / 1000),
        );
        const message =
          rule.scope === 'email-code-minute'
            ? `验证码每 60 秒可发送一次，请 ${retryAfterSeconds} 秒后重试`
            : `${rule.scope === 'email-code-hour' ? '该邮箱' : '当前网络'}的验证码发送次数已达上限，请 ${Math.ceil(retryAfterSeconds / 60)} 分钟后重试`;
        throw new HttpException({ code: 'AUTH_RATE_LIMITED', message, retryAfterSeconds }, 429);
      }
      reservations.push({ key, expiresAt: row.expiresAt });
    }
    return reservations;
  }

  async releaseEmailCode(
    reservations: EmailCodeReservation[],
    transaction: Prisma.TransactionClient,
  ): Promise<void> {
    for (const reservation of reservations) {
      // 只退还本次请求所在窗口的一次额度，避免影响其他请求或后续窗口。
      await transaction.authRateLimit.updateMany({
        where: { ...reservation, count: { gt: 0 } },
        data: { count: { decrement: 1 } },
      });
    }
  }
  async limit(scope: string, value: string, maximum: number, seconds: number): Promise<void> {
    if ((await this.hit(this.key(scope, value), seconds)) > maximum) {
      throw new HttpException(
        { code: 'AUTH_RATE_LIMITED', message: '操作过于频繁，请稍后再试' },
        429,
      );
    }
  }
  private async failures(scope: string, value: string): Promise<number> {
    const row = await this.prisma.authRateLimit.findUnique({
      where: { key: this.key(scope, value) },
    });
    return row && row.expiresAt > new Date() ? row.count : 0;
  }
  async needsCaptcha(email: string, ip: string): Promise<boolean> {
    const counts = await Promise.all([
      this.failures('login-failed-email', email),
      this.failures('login-failed-ip', ip),
    ]);
    return counts.some((count) => count >= 3);
  }
  async loginFailed(email: string, ip: string): Promise<void> {
    await Promise.all([
      this.hit(this.key('login-failed-email', email), 900),
      this.hit(this.key('login-failed-ip', ip), 900),
    ]);
  }
  async loginSucceeded(
    email: string,
    ip: string,
    transaction: Prisma.TransactionClient = this.prisma,
  ): Promise<void> {
    await transaction.authRateLimit.deleteMany({
      where: {
        key: { in: [this.key('login-failed-email', email), this.key('login-failed-ip', ip)] },
      },
    });
  }
  async createCaptcha(ip: string): Promise<LoginCaptcha> {
    await this.limit('captcha-ip', ip, 20, 60);
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const code = Array.from({ length: 4 }, () => alphabet[randomInt(alphabet.length)]).join('');
    const row = await this.prisma.loginCaptchaChallenge.create({
      data: {
        codeHash: this.digest(`captcha:${code}`),
        ipHash: this.digest(ip),
        expiresAt: new Date(Date.now() + 120000),
      },
    });
    await this.cleanup();
    return { id: row.id, image: renderCaptcha(code), expiresInSeconds: 120 };
  }
  async verifyCaptcha(id: string | undefined, code: string | undefined, ip: string): Promise<void> {
    if (!id || !code)
      throw new ForbiddenException({
        code: 'LOGIN_CAPTCHA_REQUIRED',
        message: '登录多次失败，请完成安全验证',
      });
    const row = await this.prisma.loginCaptchaChallenge.findUnique({ where: { id } });
    if (row && row.ipHash === this.digest(ip) && row.expiresAt > new Date() && !row.consumedAt) {
      const result = await this.prisma.loginCaptchaChallenge.updateMany({
        where: { id, consumedAt: null, expiresAt: { gt: new Date() } },
        data: { consumedAt: new Date() },
      });
      if (result.count === 1 && this.matches(`captcha:${code.toUpperCase()}`, row.codeHash)) return;
    }
    throw new ForbiddenException({
      code: 'CAPTCHA_INVALID',
      message: '图形验证码错误或已过期，请重新输入',
    });
  }
  async cleanup(): Promise<void> {
    const cutoff = new Date(Date.now() - 86400000);
    await Promise.all([
      this.prisma.authRateLimit.deleteMany({ where: { expiresAt: { lt: cutoff } } }),
      this.prisma.emailVerification.deleteMany({ where: { expiresAt: { lt: cutoff } } }),
      this.prisma.loginCaptchaChallenge.deleteMany({ where: { expiresAt: { lt: cutoff } } }),
    ]);
  }
}
