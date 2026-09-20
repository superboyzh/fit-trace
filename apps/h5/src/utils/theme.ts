import { ref } from 'vue';

export type ThemeMode = 'system' | 'light' | 'dark';
export type AccentId = 'lime' | 'pine' | 'teal' | 'indigo' | 'amber';

const STORAGE_KEY = 'fittrace-theme';
const ACCENT_KEY = 'fittrace-accent';
const DARK_QUERY = '(prefers-color-scheme: dark)';

/** 当前实际生效的主题：图表等画在 canvas 上的内容需要跟着重绘 */
export const resolvedTheme = ref<'light' | 'dark'>('light');

/** 当前强调色，图表同样需要跟着重绘 */
export const currentAccent = ref<AccentId>('lime');

export function getThemeMode(): ThemeMode {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === 'light' || stored === 'dark' ? stored : 'system';
}

export function applyTheme(mode: ThemeMode = getThemeMode()): void {
  const prefersDark = window.matchMedia(DARK_QUERY).matches;
  const resolved = mode === 'system' ? (prefersDark ? 'dark' : 'light') : mode;
  document.documentElement.dataset.theme = resolved;
  resolvedTheme.value = resolved;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', resolved === 'dark' ? '#14181a' : '#f6f7f5');
}

export function setThemeMode(mode: ThemeMode): void {
  localStorage.setItem(STORAGE_KEY, mode);
  applyTheme(mode);
}

export function getAccent(): AccentId {
  const stored = localStorage.getItem(ACCENT_KEY);
  const allowed: AccentId[] = ['lime', 'pine', 'teal', 'indigo', 'amber'];
  return allowed.includes(stored as AccentId) ? (stored as AccentId) : 'lime';
}

export function applyAccent(accent: AccentId = getAccent()): void {
  document.documentElement.dataset.accent = accent;
  currentAccent.value = accent;
}

export function setAccent(accent: AccentId): void {
  localStorage.setItem(ACCENT_KEY, accent);
  applyAccent(accent);
}

/** 跟随系统时，系统切换深浅色要实时同步 */
export function watchSystemTheme(): void {
  window.matchMedia(DARK_QUERY).addEventListener('change', () => {
    if (getThemeMode() === 'system') applyTheme('system');
  });
}
