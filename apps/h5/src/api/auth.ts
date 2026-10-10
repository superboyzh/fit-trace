import type {
  ApiResponse,
  AuthResult,
  EmailCodePurpose,
  EmailCodeResult,
  LoginCaptcha,
  PublicUser,
  ResetPasswordVerification,
} from '@fit-trace/shared';
import { http } from './http';

export interface LoginInput {
  email: string;
  password: string;
  captchaId?: string;
  captchaCode?: string;
}

export interface RegisterInput extends LoginInput {
  emailCode: string;
  nickname?: string;
}

export interface EmailLoginInput {
  email: string;
  emailCode: string;
  acceptedTerms: boolean;
}

export async function sendEmailCode(
  email: string,
  purpose: EmailCodePurpose,
): Promise<EmailCodeResult> {
  const response = await http.post<ApiResponse<EmailCodeResult>>(
    '/auth/email-code',
    { email, purpose },
    { timeout: 45_000 },
  );
  return response.data.data;
}

export async function getLoginCaptcha(): Promise<LoginCaptcha> {
  const response = await http.get<ApiResponse<LoginCaptcha>>('/auth/captcha');
  return response.data.data;
}

export async function verifyResetCode(
  email: string,
  emailCode: string,
): Promise<ResetPasswordVerification> {
  const response = await http.post<ApiResponse<ResetPasswordVerification>>(
    '/auth/reset-password/verify-code',
    { email, emailCode },
  );
  return response.data.data;
}

export async function resetPassword(input: {
  email: string;
  resetToken: string;
  password: string;
}): Promise<void> {
  await http.post<ApiResponse<null>>('/auth/reset-password', input);
}

export async function login(input: LoginInput): Promise<AuthResult> {
  const response = await http.post<ApiResponse<AuthResult>>('/auth/login', input);
  return response.data.data;
}

export async function loginByEmail(input: EmailLoginInput): Promise<AuthResult> {
  const response = await http.post<ApiResponse<AuthResult>>('/auth/login/email', input);
  return response.data.data;
}

export async function register(input: RegisterInput): Promise<AuthResult> {
  const response = await http.post<ApiResponse<AuthResult>>('/auth/register', input);
  return response.data.data;
}

export async function getCurrentUser(): Promise<PublicUser> {
  const response = await http.get<ApiResponse<PublicUser>>('/auth/me');
  return response.data.data;
}

export async function changePassword(input: {
  currentPassword: string;
  password: string;
}): Promise<AuthResult> {
  return (await http.patch<ApiResponse<AuthResult>>('/auth/password/session', input)).data.data;
}

export async function sendPasswordCode(): Promise<EmailCodeResult> {
  return (
    await http.post<ApiResponse<EmailCodeResult>>(
      '/auth/password/email-code',
      {},
      { timeout: 45_000 },
    )
  ).data.data;
}

export async function verifyPasswordCode(emailCode: string): Promise<ResetPasswordVerification> {
  return (
    await http.post<ApiResponse<ResetPasswordVerification>>('/auth/password/verify-code', {
      emailCode,
    })
  ).data.data;
}

export async function setPassword(input: {
  resetToken: string;
  password: string;
}): Promise<AuthResult> {
  return (await http.patch<ApiResponse<AuthResult>>('/auth/password/email', input)).data.data;
}
