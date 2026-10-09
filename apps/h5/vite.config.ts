import { fileURLToPath, URL } from 'node:url';
import vue from '@vitejs/plugin-vue';
import { defineConfig, loadEnv } from 'vite';
import { sentryVitePlugin } from '@sentry/vite-plugin';
import { resolveRelease, createGlitchTipBuildOptions } from './scripts/glitchtip-build';

const repositoryRoot = fileURLToPath(new URL('../../', import.meta.url));
const dist = fileURLToPath(new URL('./dist', import.meta.url));

export default defineConfig(({ command, mode }) => {
  const env = { ...loadEnv(mode, repositoryRoot, ''), ...process.env };
  const release = resolveRelease(env, repositoryRoot);
  const glitchTipOptions =
    command === 'build' ? createGlitchTipBuildOptions(env, release, dist) : undefined;

  return {
    plugins: [vue(), ...(glitchTipOptions ? [sentryVitePlugin(glitchTipOptions)] : [])],
    envDir: repositoryRoot,
    define: { 'import.meta.env.VITE_GLITCHTIP_RELEASE': JSON.stringify(release) },
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    server: { host: true, port: 5173 },
    build: { sourcemap: 'hidden' },
  };
});
