import type { AuthResult, PublicUser } from '@fit-trace/shared';
import { defineStore } from 'pinia';
import {
  getCurrentUser,
  login as loginRequest,
  register as registerRequest,
  type LoginInput,
  type RegisterInput,
} from '@/api/auth';
import { authSession } from '@/api/session';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: authSession.snapshot?.accessToken ?? null,
    user: authSession.snapshot?.user ?? (null as PublicUser | null),
  }),
  getters: {
    isAuthenticated: (state) => Boolean(state.token),
  },
  actions: {
    async login(input: LoginInput): Promise<void> {
      const result = await loginRequest(input);
      this.setSession(result);
    },
    async register(input: RegisterInput): Promise<void> {
      const result = await registerRequest(input);
      this.setSession(result);
    },
    async fetchCurrentUser(): Promise<void> {
      if (!this.token) return;
      const generation = authSession.generation;
      const user = await getCurrentUser();
      if (generation === authSession.generation) {
        this.user = user;
        authSession.updateUser(user);
      }
    },
    logout(): void {
      authSession.logout();
      this.token = null;
      this.user = null;
    },
    setSession(result: AuthResult): void {
      authSession.save(result);
      this.token = result.accessToken;
      this.user = result.user;
    },
  },
});
