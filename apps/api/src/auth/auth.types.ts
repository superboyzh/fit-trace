import type { PublicUser } from '../users/users.service';

export interface JwtPayload {
  sub: string;
  email: string;
  ver?: number;
  sid?: string;
}

export interface AuthResult {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  user: PublicUser;
}
