import { Capacitor } from '@capacitor/core';
import { onBeforeUnmount, onMounted } from 'vue';
import { getEmailCaptchaConfig } from '@/api/auth';
import { EmailCaptchaClient } from '@/utils/email-captcha';

export function useEmailCaptcha(): EmailCaptchaClient {
  const captcha = new EmailCaptchaClient(
    Capacitor.isNativePlatform() ? 'app' : 'web',
    getEmailCaptchaConfig,
  );
  onMounted(() => {
    // 前置加载 SDK；失败由用户下次点击时重试并提示。
    void captcha.prepare().catch(() => undefined);
  });
  onBeforeUnmount(() => captcha.dispose());
  return captcha;
}
