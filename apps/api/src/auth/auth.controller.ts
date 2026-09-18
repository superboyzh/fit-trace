import { Body, Controller, Get, Post, UnauthorizedException, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { UsersService, type PublicUser } from '../users/users.service';
import { AuthService } from './auth.service';
import type { AuthResult } from './auth.types';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly users: UsersService,
  ) {}

  @Post('register')
  async register(@Body() dto: RegisterDto): Promise<{ data: AuthResult }> {
    return { data: await this.auth.register(dto) };
  }

  @Post('login')
  async login(@Body() dto: LoginDto): Promise<{ data: AuthResult }> {
    return { data: await this.auth.login(dto) };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@CurrentUser('sub') userId: string): Promise<{ data: PublicUser }> {
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
