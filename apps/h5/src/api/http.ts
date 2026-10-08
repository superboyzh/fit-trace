import axios from 'axios';
import { installResponseHandlers } from './response-handler';
import router from '@/router';
import { pinia } from '@/stores';
import { useAuthStore } from '@/stores/auth';
import { getAccessToken } from '@/utils/auth-token';
import { showRequestError } from '@/utils/request-error';

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1',
  timeout: 10_000,
});

http.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let redirecting = false;
installResponseHandlers(http, {
  notify: showRequestError,
  onUnauthorized: () => {
    useAuthStore(pinia).logout();
    if (router.currentRoute.value.name === 'login' || redirecting) return;
    redirecting = true;
    const redirect = router.currentRoute.value.fullPath;
    void router.replace({ name: 'login', query: { redirect } }).finally(() => {
      redirecting = false;
    });
  },
});
