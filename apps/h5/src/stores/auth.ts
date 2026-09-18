import type { PublicUser } from '@fit-trace/shared';
import { defineStore } from 'pinia';
import {
  getCurrentUser,
  login as loginRequest,
  register as registerRequest,
  type LoginInput,
  type RegisterInput,
} from '@/api/auth';
import { getAccessToken, removeAccessToken, setAccessToken } from '@/utils/auth-token';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: getAccessToken(),
    user: null as PublicUser | null,
  }),
  getters: {
    isAuthenticated: (state) => Boolean(state.token),
  },
  actions: {
    async login(input: LoginInput): Promise<void> {
      const result = await loginRequest(input);
      this.setSession(result.accessToken, result.user);
    },
    async register(input: RegisterInput): Promise<void> {
      const result = await registerRequest(input);
      this.setSession(result.accessToken, result.user);
    },
    async fetchCurrentUser(): Promise<void> {
      if (!this.token) return;
      this.user = await getCurrentUser();
    },
    logout(): void {
      removeAccessToken();
      this.token = null;
      this.user = null;
    },
    setSession(token: string, user: PublicUser): void {
      setAccessToken(token);
      this.token = token;
      this.user = user;
    },
  },
});
