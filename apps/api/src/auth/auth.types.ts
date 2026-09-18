import type { PublicUser } from '../users/users.service';

export interface JwtPayload {
  sub: string;
  email: string;
}

export interface AuthResult {
  accessToken: string;
  user: PublicUser;
}
