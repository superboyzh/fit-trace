import { createApp } from 'vue';
import 'tdesign-mobile-vue/es/style/index.css';
import App from './App.vue';
import router from './router';
import { pinia } from './stores';
import './styles/global.scss';

createApp(App).use(pinia).use(router).mount('#app');
