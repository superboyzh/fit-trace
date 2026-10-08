import type { PublicUser } from '../users/users.service';

export interface JwtPayload {
  sub: string;
  email: string;
  ver?: number;
}

export interface AuthResult {
  accessToken: string;
  user: PublicUser;
}
