import axios from 'axios';
import { installResponseHandlers } from './response-handler';
import router from '@/router';
import { apiBaseURL, authSession } from './session';
import { installSessionInterceptor } from './session-interceptor';
import { showRequestError } from '@/utils/request-error';

export const http = axios.create({
  baseURL: apiBaseURL,
  timeout: 10_000,
});

installSessionInterceptor(http, authSession);

let redirecting = false;
installResponseHandlers(http, {
  notify: showRequestError,
  onUnauthorized: () => {
    if (authSession.snapshot) return;
    if (router.currentRoute.value.name === 'login' || redirecting) return;
    redirecting = true;
    const redirect = router.currentRoute.value.fullPath;
    void router.replace({ name: 'login', query: { redirect } }).finally(() => {
      redirecting = false;
    });
  },
});
