import { randomInt } from 'node:crypto';
import { BadRequestException, Injectable } from '@nestjs/common';
import type { EmailCodePurpose, EmailCodeResult } from '@fit-trace/shared';
import type { EmailVerification, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthSecurityService } from './auth-security.service';
import { MailService } from './mail.service';

@Injectable()
export class EmailVerificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly security: AuthSecurityService,
    private readonly mail: MailService,
  ) {}

  async send(email: string, purpose: EmailCodePurpose, ip: string): Promise<EmailCodeResult> {
    this.mail.assertConfigured();
    await this.security.limit('email-code-ip', ip, 10, 3600);
    await this.security.limit('email-code-minute', `${email}:${purpose}`, 1, 60);
    await this.security.limit('email-code-hour', email, 5, 3600);
    await this.security.cleanup();
    const user = await this.prisma.user.findUnique({ where: { email }, select: { id: true } });
    // 返回相同结果，不通过验证码发送接口暴露账户是否存在。
    if ((purpose === 'RESET_PASSWORD' && !user) || (purpose === 'REGISTER' && user)) {
      return { retryAfterSeconds: 60, expiresInSeconds: 600 };
    }
    const code = randomInt(0, 1000000).toString().padStart(6, '0');
    const codeHash = this.security.digest(`email:${email}:${purpose}:${code}`);
    const data = {
      codeHash,
      expiresAt: new Date(Date.now() + 600000),
      attempts: 0,
      consumedAt: null,
      createdAt: new Date(),
    };
    const row = await this.prisma.emailVerification.upsert({
      where: { email_purpose: { email, purpose } },
      create: { email, purpose, ...data },
      update: data,
    });
    try {
      await this.mail.sendCode(email, purpose, code);
    } catch (error) {
      await this.prisma.emailVerification.deleteMany({ where: { id: row.id, codeHash } });
      throw error;
    }
    return { retryAfterSeconds: 60, expiresInSeconds: 600 };
  }

  async withCode<T>(
    email: string,
    purpose: EmailCodePurpose,
    code: string,
    action: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    const result = await this.prisma.$transaction(
      async (tx) => {
        // 锁住这条验证码；消费和业务写入在同一事务中，阻止并发重放。
        const rows = await tx.$queryRaw<
          EmailVerification[]
        >`SELECT * FROM "email_verifications" WHERE "email" = ${email} AND "purpose" = ${purpose}::"EmailCodePurpose" FOR UPDATE`;
        const row = rows[0];
        if (!row || row.consumedAt || row.expiresAt <= new Date())
          return { ok: false as const, expired: true };
        if (row.attempts >= 5) return { ok: false as const, expired: false };
        if (!this.security.matches(`email:${email}:${purpose}:${code}`, row.codeHash)) {
          await tx.emailVerification.update({
            where: { id: row.id },
            data: { attempts: { increment: 1 } },
          });
          return { ok: false as const, expired: false };
        }
        await tx.emailVerification.update({
          where: { id: row.id },
          data: { consumedAt: new Date() },
        });
        return { ok: true as const, value: await action(tx) };
      },
      { timeout: 15000 },
    );
    if (!result.ok)
      throw new BadRequestException({
        code: result.expired ? 'EMAIL_CODE_EXPIRED' : 'EMAIL_CODE_INVALID',
        message: result.expired
          ? '邮箱验证码已过期或未发送，请重新获取'
          : '邮箱验证码错误或尝试次数过多，请重新获取',
      });
    return result.value;
  }
}
