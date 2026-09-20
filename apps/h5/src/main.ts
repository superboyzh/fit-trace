import { createApp } from 'vue';
import 'tdesign-mobile-vue/es/style/index.css';
import App from './App.vue';
import router from './router';
import { pinia } from './stores';
import './styles/global.scss';
import { applyTheme, watchSystemTheme } from './utils/theme';

// 主题要在挂载前定好，避免首屏闪一下浅色
applyTheme();
watchSystemTheme();

createApp(App).use(pinia).use(router).mount('#app');
