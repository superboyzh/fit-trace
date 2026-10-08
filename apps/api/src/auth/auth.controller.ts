import type {
  ApiPayload,
  EmailCodeResult,
  LoginCaptcha,
  ResetPasswordVerification,
} from '@fit-trace/shared';
import { Body, Controller, Get, Post, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { UsersService, type PublicUser } from '../users/users.service';
import { AuthService } from './auth.service';
import type { AuthResult } from './auth.types';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { EmailCodeDto } from './dto/email-code.dto';
import { VerifyResetCodeDto } from './dto/verify-reset-code.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { AuthSecurityService } from './auth-security.service';
import { EmailVerificationService } from './email-verification.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly users: UsersService,
    private readonly security: AuthSecurityService,
    private readonly verification: EmailVerificationService,
  ) {}

  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Req() request: Request,
  ): Promise<ApiPayload<AuthResult>> {
    return { data: await this.auth.register(dto, this.clientIp(request)) };
  }

  @Post('login')
  async login(@Body() dto: LoginDto, @Req() request: Request): Promise<ApiPayload<AuthResult>> {
    return { data: await this.auth.login(dto, this.clientIp(request)) };
  }

  @Post('email-code')
  async sendEmailCode(
    @Body() dto: EmailCodeDto,
    @Req() request: Request,
  ): Promise<ApiPayload<EmailCodeResult>> {
    return { data: await this.verification.send(dto.email, dto.purpose, this.clientIp(request)) };
  }

  @Get('captcha')
  async captcha(@Req() request: Request): Promise<ApiPayload<LoginCaptcha>> {
    return { data: await this.security.createCaptcha(this.clientIp(request)) };
  }

  @Post('reset-password/verify-code')
  async verifyResetCode(
    @Body() dto: VerifyResetCodeDto,
    @Req() request: Request,
  ): Promise<ApiPayload<ResetPasswordVerification>> {
    return { data: await this.auth.verifyResetCode(dto, this.clientIp(request)) };
  }

  @Post('reset-password')
  async resetPassword(
    @Body() dto: ResetPasswordDto,
    @Req() request: Request,
  ): Promise<ApiPayload<null>> {
    await this.auth.resetPassword(dto, this.clientIp(request));
    return { data: null };
  }

  private clientIp(request: Request): string {
    return request.ip ?? request.socket.remoteAddress ?? 'unknown';
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@CurrentUser('sub') userId: string): Promise<ApiPayload<PublicUser>> {
    const user = await this.users.findPublicById(userId);
    if (!user) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: '登录状态已失效，请重新登录',
      });
    }
    return { data: user };
  }
}
