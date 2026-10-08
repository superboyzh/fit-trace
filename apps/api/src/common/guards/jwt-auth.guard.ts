import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import type { JwtPayload } from '../../auth/auth.types';
import { PrismaService } from '../../prisma/prisma.service';

interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractBearerToken(request);
    if (!token) {
      throw this.unauthorized();
    }

    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(token);
    } catch {
      throw this.unauthorized();
    }
    if (typeof payload.sub !== 'string') throw this.unauthorized();
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { tokenVersion: true },
    });
    if (!user || (payload.ver ?? 0) !== user.tokenVersion) throw this.unauthorized();
    request.user = payload;
    return true;
  }

  private extractBearerToken(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }

  private unauthorized(): UnauthorizedException {
    return new UnauthorizedException({
      code: 'UNAUTHORIZED',
      message: '请先登录或重新登录',
    });
  }
}
