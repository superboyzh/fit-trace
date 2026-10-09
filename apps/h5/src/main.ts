import { createApp } from 'vue';
import 'tdesign-mobile-vue/es/style/index.css';
import App from './App.vue';
import router from './router';
import { pinia } from './stores';
import './styles/global.scss';
import { applyTheme, watchSystemTheme } from './utils/theme';
import { setupNativeShell } from './utils/native';
import { authSession } from './api/session';
import { useAuthStore } from './stores/auth';

// 主题要在挂载前定好，避免首屏闪一下浅色
// 品牌统一使用松针绿，清理旧版强调色偏好。
localStorage.removeItem('fittrace-accent');
applyTheme();
watchSystemTheme();
setupNativeShell();
authSession.subscribe((session) => {
  useAuthStore(pinia).$patch({ token: session?.accessToken ?? null, user: session?.user ?? null });
});
window.addEventListener('online', () => void authSession.restore());
window.addEventListener('storage', () => authSession.syncFromStorage());

createApp(App).use(pinia).use(router).mount('#app');

/**
 * 四个主 tab 是懒加载的，首次切换要等 chunk，会闪一下空白。
 * 挂载后在空闲时预热，用户点过去时已经就绪（含 ECharts 那块大包）。
 */
function prefetchTabViews(): void {
  void import('@/views/DashboardView.vue');
  void import('@/views/TrendsView.vue');
  void import('@/views/ArchiveView.vue');
  void import('@/views/ProfileView.vue');
}

if ('requestIdleCallback' in window) {
  window.requestIdleCallback(prefetchTabViews, { timeout: 2000 });
} else {
  setTimeout(prefetchTabViews, 800);
}
