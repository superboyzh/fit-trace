import { execFileSync } from 'node:child_process';
import type { SentryVitePluginOptions } from '@sentry/vite-plugin';

type BuildEnv = Record<string, string | undefined>;

export function resolveRelease(env: BuildEnv, repositoryRoot: string): string {
  const configured = env.VITE_GLITCHTIP_RELEASE?.trim() || env.SENTRY_RELEASE?.trim();
  if (configured) return configured;
  try {
    return execFileSync('git', ['describe', '--always', '--dirty', '--abbrev=12'], {
      cwd: repositoryRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return env.npm_package_version?.trim() || '0.1.0';
  }
}

export function createGlitchTipBuildOptions(
  env: BuildEnv,
  release: string,
  dist: string,
): SentryVitePluginOptions | undefined {
  if (env.VITE_GLITCHTIP_ENABLED === 'false' || env.VITE_GLITCHTIP_DSN?.trim() === '')
    return undefined;

  for (const key of ['SENTRY_ORG', 'SENTRY_PROJECT', 'SENTRY_AUTH_TOKEN']) {
    if (!env[key]?.trim()) throw new Error(`请在本地 .env 或构建环境配置 ${key}`);
  }

  let uploadFailed = false;
  return {
    url: env.SENTRY_URL?.trim() || 'https://glitchtip.moshangl.cn',
    org: env.SENTRY_ORG!.trim(),
    project: env.SENTRY_PROJECT!.trim(),
    authToken: env.SENTRY_AUTH_TOKEN!.trim(),
    telemetry: false,
    release: { name: release, setCommits: false },
    errorHandler(error) {
      uploadFailed = true;
      throw error;
    },
    sourcemaps: {
      assets: `${dist}/**`,
      // 插件失败时也会执行清理，必须保留映射并让构建失败。
      get filesToDeleteAfterUpload() {
        return uploadFailed ? [] : `${dist}/**/*.map`;
      },
    },
  };
}
