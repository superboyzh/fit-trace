import type { AuthResult, PublicUser } from '@fit-trace/shared';

const SESSION_KEY = 'fit-trace:session';
const LEGACY_KEY = 'fit-trace:access-token';
const REVOKE_KEY = 'fit-trace:pending-logouts';

interface Session {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string | null;
  user: PublicUser | null;
}

interface Transport {
  refresh: (token: string) => Promise<AuthResult>;
  upgrade: (token: string) => Promise<AuthResult>;
  revoke: (token: string) => Promise<void>;
}

export function isUnauthorized(error: unknown): boolean {
  const response = (error as { response?: { status?: number; data?: { code?: string } } })
    ?.response;
  return response?.status === 401 || response?.data?.code === 'UNAUTHORIZED';
}

export class AuthSessionManager {
  private storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
  private transport: Transport;
  private now: () => number;
  private current: Session | null;
  private revision = 0;
  private pending?: { revision: number; promise: Promise<string | null> };
  private listeners = new Set<(session: Session | null) => void>();

  constructor(
    storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>,
    transport: Transport,
    now: () => number = Date.now,
  ) {
    this.storage = storage;
    this.transport = transport;
    this.now = now;
    this.current = this.readSession();
  }

  get snapshot(): Session | null {
    return this.current;
  }

  get generation(): number {
    return this.revision;
  }

  subscribe(listener: (session: Session | null) => void): void {
    this.listeners.add(listener);
  }

  syncFromStorage(): void {
    const next = this.readSession();
    if (JSON.stringify(next) === JSON.stringify(this.current)) return;
    this.revision++;
    this.current = next;
    this.emit();
  }

  save(result: AuthResult): void {
    this.revision++;
    this.write(result);
  }

  updateUser(user: PublicUser): void {
    if (this.current?.user?.id === user.id) this.write({ ...this.current, user });
  }

  clear(): void {
    this.revision++;
    this.current = null;
    this.storage.removeItem(SESSION_KEY);
    this.storage.removeItem(LEGACY_KEY);
    this.emit();
  }

  async restore(): Promise<void> {
    void this.flushLogouts();
    try {
      await this.accessToken();
    } catch {
      // 离线、超时或服务不可用不等于注销；下一次请求会重新尝试。
    }
  }

  async accessToken(force = false): Promise<string | null> {
    const session = this.current;
    if (!session) return null;
    if (
      !force &&
      session.refreshToken &&
      Date.parse(session.accessTokenExpiresAt) > this.now() + 30_000
    )
      return session.accessToken;

    const revision = this.revision;
    if (this.pending?.revision === revision) return this.pending.promise;
    const promise = (async () => {
      try {
        const result = session.refreshToken
          ? await this.transport.refresh(session.refreshToken)
          : await this.transport.upgrade(session.accessToken);
        // 退出或切换账号后，不允许旧的续期请求重新写回登录状态。
        if (revision !== this.revision) return null;
        this.write(result);
        return result.accessToken;
      } catch (error) {
        if (revision !== this.revision) return null;
        if (revision === this.revision && isUnauthorized(error)) this.clear();
        throw error;
      } finally {
        if (this.pending?.revision === revision) this.pending = undefined;
      }
    })();
    this.pending = { revision, promise };
    return promise;
  }

  logout(): void {
    const token = this.current?.refreshToken;
    if (token) this.storage.setItem(REVOKE_KEY, JSON.stringify([...this.pendingLogouts(), token]));
    this.clear();
    void this.flushLogouts();
  }

  async flushLogouts(): Promise<void> {
    for (const token of this.pendingLogouts()) {
      try {
        await this.transport.revoke(token);
        const remaining = this.pendingLogouts().filter((item) => item !== token);
        if (remaining.length) this.storage.setItem(REVOKE_KEY, JSON.stringify(remaining));
        else this.storage.removeItem(REVOKE_KEY);
      } catch {
        // 断网退出先清除本机账号，恢复联网后补发服务端撤销。
      }
    }
  }

  private pendingLogouts(): string[] {
    try {
      const value: unknown = JSON.parse(this.storage.getItem(REVOKE_KEY) ?? '[]');
      return Array.isArray(value)
        ? value.filter((item): item is string => typeof item === 'string')
        : [];
    } catch {
      return [];
    }
  }

  private readSession(): Session | null {
    try {
      const value = JSON.parse(this.storage.getItem(SESSION_KEY) ?? 'null') as Session | null;
      if (
        value &&
        typeof value.accessToken === 'string' &&
        typeof value.refreshToken === 'string' &&
        typeof value.accessTokenExpiresAt === 'string' &&
        value.user?.id
      )
        return value;
    } catch {
      this.storage.removeItem(SESSION_KEY);
    }
    const legacy = this.storage.getItem(LEGACY_KEY);
    return legacy
      ? { accessToken: legacy, accessTokenExpiresAt: '', refreshToken: null, user: null }
      : null;
  }

  private write(session: Session): void {
    this.storage.setItem(SESSION_KEY, JSON.stringify(session));
    this.storage.removeItem(LEGACY_KEY);
    this.current = session;
    this.emit();
  }

  private emit(): void {
    this.listeners.forEach((listener) => listener(this.current));
  }
}
