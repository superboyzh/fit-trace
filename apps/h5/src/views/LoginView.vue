<script setup lang="ts">
import type { ApiErrorResponse, LoginCaptcha } from '@fit-trace/shared';
import axios from 'axios';
import { Button, ToastPlugin } from 'tdesign-mobile-vue';
import { ChevronLeftIcon, BrowseIcon, BrowseOffIcon } from 'tdesign-icons-vue-next';
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getLoginCaptcha, resetPassword, sendEmailCode, verifyResetCode } from '@/api/auth';
import { useAuthStore } from '@/stores/auth';

type Mode = 'login' | 'register' | 'reset';
const auth = useAuthStore();
const route = useRoute();
const router = useRouter();
const mode = ref<Mode>('login');
const email = ref('');
const password = ref('');
const emailCode = ref('');
const confirmPassword = ref('');
const resetGrant = ref<{ token: string; email: string; expiresAt: number } | null>(null);
const showPassword = ref(false);
const submitting = ref(false);
const sendingCode = ref(false);
const captchaLoading = ref(false);
const captchaRequired = ref(false);
const captcha = ref<LoginCaptcha | null>(null);
const captchaCode = ref('');
const sentTo = ref('');
const resendAt = ref(0);
const codeCooldowns = new Map<string, number>();
function cooldownKey(): string {
  return `${mode.value}:${email.value.trim().toLowerCase()}`;
}
const now = ref(Date.now());
const errors = reactive({
  email: '',
  password: '',
  confirmPassword: '',
  emailCode: '',
  captchaCode: '',
});
const busy = computed(() => submitting.value || sendingCode.value);
const countdown = computed(() => Math.max(0, Math.ceil((resendAt.value - now.value) / 1000)));
const title = computed(() =>
  mode.value === 'reset' && resetGrant.value
    ? '设置新密码'
    : { login: '登录 FitTrace', register: '创建账户', reset: '找回密码' }[mode.value],
);
const subtitle = computed(
  () =>
    ({
      login: '继续记录你的身体、饮食与训练。',
      register: '验证邮箱，开始记录你的变化。',
      reset: resetGrant.value ? '邮箱验证已通过，请设置新密码。' : '先验证邮箱，确认是你本人操作。',
    })[mode.value],
);
const submitLabel = computed(
  () =>
    ({ login: '登录', register: '创建账户', reset: resetGrant.value ? '确认重置' : '验证并继续' })[
      mode.value
    ],
);
const timer = setInterval(() => {
  now.value = Date.now();
}, 1000);
onBeforeUnmount(() => clearInterval(timer));

function clearErrors(): void {
  Object.assign(errors, {
    email: '',
    password: '',
    confirmPassword: '',
    emailCode: '',
    captchaCode: '',
  });
}
function switchMode(next: Mode): void {
  if (busy.value) return;
  mode.value = next;
  password.value = '';
  confirmPassword.value = '';
  resetGrant.value = null;
  emailCode.value = '';
  showPassword.value = false;
  sentTo.value = '';
  resendAt.value = codeCooldowns.get(cooldownKey()) ?? 0;
  clearErrors();
}
function restartReset(): void {
  if (busy.value) return;
  resetGrant.value = null;
  password.value = '';
  confirmPassword.value = '';
  emailCode.value = '';
  showPassword.value = false;
  clearErrors();
}
watch(email, () => {
  if (mode.value === 'reset') {
    resetGrant.value = null;
    password.value = '';
    confirmPassword.value = '';
  }
  errors.email = '';
  errors.emailCode = '';
  emailCode.value = '';
  sentTo.value = '';
  resendAt.value = codeCooldowns.get(cooldownKey()) ?? 0;
});

function validateEmail(): boolean {
  const value = email.value.trim();
  errors.email = !value
    ? '请输入邮箱地址'
    : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
      ? '请输入正确的邮箱地址'
      : '';
  return !errors.email;
}
async function refreshCaptcha(): Promise<void> {
  if (captchaLoading.value) return;
  captchaLoading.value = true;
  captchaCode.value = '';
  captcha.value = null;
  try {
    captcha.value = await getLoginCaptcha();
  } finally {
    captchaLoading.value = false;
  }
}
function handleError(error: unknown): void {
  if (!axios.isAxiosError<ApiErrorResponse>(error)) return;
  const code = error.response?.data?.code;
  const message = error.response?.data?.message ?? '';
  if (code === 'EMAIL_CODE_INVALID' || code === 'EMAIL_CODE_EXPIRED') errors.emailCode = message;
  if (code === 'RESET_VERIFICATION_INVALID') {
    resetGrant.value = null;
    password.value = '';
    confirmPassword.value = '';
    errors.emailCode = message;
  }
  if (code === 'EMAIL_ALREADY_REGISTERED') errors.email = message;
  if (code === 'INVALID_CREDENTIALS') errors.password = message;
  if (code === 'LOGIN_CAPTCHA_REQUIRED' || code === 'CAPTCHA_INVALID') {
    captchaRequired.value = true;
    errors.captchaCode = message;
    void refreshCaptcha().catch(() => undefined);
  } else if (mode.value === 'login' && captchaRequired.value) {
    void refreshCaptcha().catch(() => undefined);
  }
}
async function requestEmailCode(): Promise<void> {
  if (busy.value || countdown.value || !validateEmail()) return;
  sendingCode.value = true;
  try {
    const result = await sendEmailCode(
      email.value.trim(),
      mode.value === 'register' ? 'REGISTER' : 'RESET_PASSWORD',
    );
    sentTo.value = email.value.trim();
    now.value = Date.now();
    resendAt.value = now.value + result.retryAfterSeconds * 1000;
    codeCooldowns.set(cooldownKey(), resendAt.value);
    ToastPlugin.success('若邮箱可用，验证码将发送至你的邮箱');
  } catch (error) {
    handleError(error);
  } finally {
    sendingCode.value = false;
  }
}
async function submit(): Promise<void> {
  if (busy.value) return;
  clearErrors();
  const validEmail = validateEmail();
  if (
    (mode.value !== 'reset' || resetGrant.value) &&
    (password.value.length < 8 || password.value.length > 72)
  )
    errors.password = '密码需要 8–72 位';
  if (mode.value === 'reset' && resetGrant.value && confirmPassword.value !== password.value)
    errors.confirmPassword = '两次输入的密码不一致';
  if (
    (mode.value === 'register' || (mode.value === 'reset' && !resetGrant.value)) &&
    !/^\d{6}$/.test(emailCode.value)
  )
    errors.emailCode = '请输入 6 位邮箱验证码';
  if (
    mode.value === 'login' &&
    captchaRequired.value &&
    (!captcha.value || !/^[a-z\d]{4}$/i.test(captchaCode.value))
  )
    errors.captchaCode = '请输入图片中的 4 位字符';
  if (!validEmail || Object.values(errors).some(Boolean)) return;
  submitting.value = true;
  try {
    const input = { email: email.value.trim(), password: password.value };
    if (mode.value === 'reset') {
      if (!resetGrant.value) {
        const result = await verifyResetCode(input.email, emailCode.value);
        resetGrant.value = {
          token: result.resetToken,
          email: input.email.toLowerCase(),
          expiresAt: Date.now() + result.expiresInSeconds * 1000,
        };
        password.value = '';
        confirmPassword.value = '';
        emailCode.value = '';
        return;
      }
      if (resetGrant.value.expiresAt <= Date.now()) {
        resetGrant.value = null;
        password.value = '';
        confirmPassword.value = '';
        errors.emailCode = '邮箱验证已过期，请重新验证';
        return;
      }
      await resetPassword({
        email: resetGrant.value.email,
        password: password.value,
        resetToken: resetGrant.value.token,
      });
      submitting.value = false;
      switchMode('login');
      ToastPlugin.success('密码已更新，请使用新密码登录');
      return;
    }
    if (mode.value === 'login') {
      await auth.login({
        ...input,
        ...(captchaRequired.value && captcha.value
          ? { captchaId: captcha.value.id, captchaCode: captchaCode.value }
          : {}),
      });
    } else {
      await auth.register({ ...input, emailCode: emailCode.value });
    }
    const redirect =
      typeof route.query.redirect === 'string' &&
      route.query.redirect.startsWith('/') &&
      !route.query.redirect.startsWith('//') &&
      !route.query.redirect.startsWith('/login')
        ? route.query.redirect
        : '/dashboard';
    await router.replace(redirect);
  } catch (error) {
    handleError(error);
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <main class="auth-page">
    <div class="auth-shell">
      <header class="auth-header">
        <button
          v-if="mode !== 'login'"
          class="back-button"
          type="button"
          :disabled="busy"
          @click="mode === 'reset' && resetGrant ? restartReset() : switchMode('login')"
        >
          <ChevronLeftIcon /> {{ mode === 'reset' && resetGrant ? '返回邮箱验证' : '返回登录' }}
        </button>
        <div v-else class="auth-brand">
          <span class="brand-mark" aria-hidden="true"><i /><i /><i /></span>FitTrace
        </div>
      </header>
      <section class="auth-content">
        <h1>{{ title }}</h1>
        <p class="auth-subtitle">{{ subtitle }}</p>
        <p v-if="mode === 'reset'" class="reset-steps" aria-label="找回密码步骤">
          <span :class="{ active: !resetGrant }">1 验证邮箱</span><span aria-hidden="true">→</span
          ><span :class="{ active: resetGrant }">2 设置新密码</span>
        </p>
        <div v-if="mode === 'reset' && resetGrant" class="verified-email">
          <span>已验证邮箱</span><strong>{{ resetGrant.email }}</strong>
        </div>
        <form novalidate @submit.prevent="submit">
          <div v-if="mode !== 'reset' || !resetGrant" class="form-field">
            <label for="auth-email">邮箱</label>
            <input
              id="auth-email"
              v-model="email"
              type="email"
              inputmode="email"
              autocomplete="username"
              autocapitalize="none"
              spellcheck="false"
              placeholder="输入你的邮箱"
              :readonly="busy"
              :aria-invalid="Boolean(errors.email)"
              aria-describedby="email-error"
            />
            <small v-if="errors.email" id="email-error" class="field-error" role="alert">{{
              errors.email
            }}</small>
          </div>
          <div v-if="mode === 'register' || (mode === 'reset' && !resetGrant)" class="form-field">
            <label for="auth-email-code">邮箱验证码</label>
            <div class="code-field" :class="{ invalid: errors.emailCode }">
              <input
                id="auth-email-code"
                v-model="emailCode"
                type="text"
                inputmode="numeric"
                autocomplete="one-time-code"
                maxlength="6"
                placeholder="6 位验证码"
                :readonly="busy"
                :aria-invalid="Boolean(errors.emailCode)"
                aria-describedby="email-code-hint"
              />
              <Button
                variant="text"
                size="small"
                :loading="sendingCode"
                :disabled="busy || countdown > 0"
                @click="requestEmailCode"
                >{{ countdown ? `${countdown}s 后重发` : '获取验证码' }}</Button
              >
            </div>
            <small
              id="email-code-hint"
              :class="errors.emailCode ? 'field-error' : 'field-hint'"
              :role="errors.emailCode ? 'alert' : undefined"
              >{{
                errors.emailCode ||
                (sentTo ? `已请求发送至 ${sentTo}，10 分钟内有效` : '验证码用于确认邮箱归属')
              }}</small
            >
          </div>
          <div v-if="mode !== 'reset' || resetGrant" class="form-field">
            <label for="auth-password">{{
              mode === 'reset' ? '新密码' : mode === 'register' ? '设置密码' : '密码'
            }}</label>
            <div class="password-field" :class="{ invalid: errors.password }">
              <input
                id="auth-password"
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                :autocomplete="mode === 'login' ? 'current-password' : 'new-password'"
                maxlength="72"
                :placeholder="mode === 'login' ? '输入密码' : '设置 8–72 位密码'"
                :readonly="busy"
                :aria-invalid="Boolean(errors.password)"
                aria-describedby="password-hint"
              />
              <button
                type="button"
                class="visibility-button"
                :aria-label="showPassword ? '隐藏密码' : '显示密码'"
                :aria-pressed="showPassword"
                @click="showPassword = !showPassword"
              >
                <BrowseOffIcon v-if="showPassword" /><BrowseIcon v-else />
              </button>
            </div>
            <small
              v-if="errors.password || mode !== 'login'"
              id="password-hint"
              :class="errors.password ? 'field-error' : 'field-hint'"
              :role="errors.password ? 'alert' : undefined"
              >{{ errors.password || '8–72 位，建议组合字母、数字与符号' }}</small
            >
          </div>
          <div v-if="mode === 'reset' && resetGrant" class="form-field">
            <label for="auth-confirm-password">确认新密码</label>
            <input
              id="auth-confirm-password"
              v-model="confirmPassword"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="new-password"
              maxlength="72"
              placeholder="再次输入新密码"
              :readonly="busy"
              :aria-invalid="Boolean(errors.confirmPassword)"
              aria-describedby="confirm-password-error"
            />
            <small
              v-if="errors.confirmPassword"
              id="confirm-password-error"
              class="field-error"
              role="alert"
              >{{ errors.confirmPassword }}</small
            >
          </div>
          <div v-if="mode === 'login' && captchaRequired" class="form-field">
            <label for="auth-captcha">安全验证</label>
            <div class="captcha-field">
              <input
                id="auth-captcha"
                v-model="captchaCode"
                maxlength="4"
                autocomplete="off"
                autocapitalize="characters"
                placeholder="图片中的 4 位字符"
                :readonly="busy"
                :aria-invalid="Boolean(errors.captchaCode)"
                aria-describedby="captcha-hint"
              /><button
                type="button"
                class="captcha-image"
                :disabled="captchaLoading || busy"
                aria-label="刷新图形验证码"
                @click="refreshCaptcha().catch(() => undefined)"
              >
                <img v-if="captcha" :src="captcha.image" alt="图形验证码" /><span v-else>{{
                  captchaLoading ? '加载中…' : '点击获取'
                }}</span>
              </button>
            </div>
            <small id="captcha-hint" :class="errors.captchaCode ? 'field-error' : 'field-hint'">{{
              errors.captchaCode || '点击图片可换一张，验证码 2 分钟内有效'
            }}</small>
          </div>
          <div v-if="mode === 'login'" class="form-actions">
            <button type="button" :disabled="busy" @click="switchMode('reset')">忘记密码？</button>
          </div>
          <Button
            class="submit-button"
            type="submit"
            theme="primary"
            size="large"
            block
            :loading="submitting"
            :disabled="sendingCode || (mode === 'login' && captchaRequired && !captcha)"
            >{{ submitting ? '请稍候…' : submitLabel }}</Button
          >
        </form>
        <p class="mode-link">
          <template v-if="mode === 'login'"
            >没有账户？<button type="button" :disabled="busy" @click="switchMode('register')">
              注册
            </button></template
          ><template v-else
            >已有账户？<button type="button" :disabled="busy" @click="switchMode('login')">
              登录
            </button></template
          >
        </p>
      </section>
      <footer class="auth-footer">记录行动，看见改变。</footer>
    </div>
  </main>
</template>

<style scoped lang="scss">
.auth-page {
  min-height: 100vh;
  min-height: 100dvh;
  padding: var(--app-safe-area-top) var(--app-safe-area-right) var(--app-safe-area-bottom)
    var(--app-safe-area-left);
  background: var(--color-background);
}
.auth-shell {
  width: min(100%, 440px);
  margin: 0 auto;
  padding: 0 24px;
}
.auth-header {
  display: flex;
  min-height: 88px;
  align-items: center;
}
.auth-brand {
  display: flex;
  align-items: center;
  gap: 9px;
  font-size: 1.1rem;
  font-weight: 750;
  color: var(--color-text-primary);
}
.brand-mark {
  display: flex;
  align-items: flex-end;
  gap: 3px;
  height: 20px;
  i {
    width: 4px;
    border-radius: 2px;
    background: var(--color-primary);
    &:nth-child(1) {
      height: 9px;
    }
    &:nth-child(2) {
      height: 15px;
    }
    &:nth-child(3) {
      height: 20px;
    }
  }
}
.auth-content {
  padding-top: 22px;
  h1 {
    margin: 0;
    font-size: 1.65rem;
    font-weight: 750;
    letter-spacing: -0.03em;
  }
}
.reset-steps {
  display: flex;
  gap: 12px;
  margin: -12px 0 28px;
  color: var(--color-text-tertiary);
  font-size: 0.8125rem;
  .active {
    color: var(--color-text-primary);
    font-weight: 650;
  }
}
.verified-email {
  display: grid;
  gap: 6px;
  margin-bottom: 24px;
  font-size: 0.875rem;
  span {
    color: var(--color-text-secondary);
  }
  strong {
    overflow-wrap: anywhere;
  }
}
.auth-subtitle {
  margin: 9px 0 32px;
  color: var(--color-text-secondary);
  font-size: 0.875rem;
  line-height: 1.6;
}
form {
  display: grid;
  gap: 20px;
}
.form-field {
  display: grid;
  gap: 8px;
  label {
    font-size: 0.875rem;
    font-weight: 650;
  }
}
input {
  width: 100%;
  min-width: 0;
  height: 48px;
  padding: 0 13px;
  outline: none;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  color: var(--color-text-primary);
  background: var(--color-surface);
  font-size: 16px;
  &::placeholder {
    color: var(--color-text-tertiary);
  }
  &:focus {
    border-color: var(--color-primary);
  }
  &[aria-invalid='true'] {
    border-color: var(--color-danger-text);
  }
}
.password-field,
.code-field {
  display: flex;
  align-items: center;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-surface);
  &:focus-within {
    border-color: var(--color-primary);
  }
  &.invalid {
    border-color: var(--color-danger-text);
  }
  input {
    border: 0;
    background: transparent;
  }
}
.code-field {
  > .t-button {
    flex-shrink: 0;
    margin-right: 5px;
    font-size: 0.8125rem;
  }
}
.visibility-button {
  display: grid;
  flex: 0 0 44px;
  height: 44px;
  place-items: center;
  color: var(--color-text-secondary);
  svg {
    font-size: 21px;
  }
}
button:not(.t-button) {
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--color-primary);
  cursor: pointer;
  &:disabled {
    opacity: 0.55;
    cursor: default;
  }
}
.back-button {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--color-text-secondary) !important;
  font-size: 0.875rem;
  svg {
    font-size: 20px;
  }
}
.field-error,
.field-hint {
  font-size: 0.75rem;
  line-height: 1.5;
  overflow-wrap: anywhere;
}
.field-error {
  color: var(--color-danger-text);
}
.field-hint {
  color: var(--color-text-tertiary);
}
.form-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: -6px;
  font-size: 0.8125rem;
}
.submit-button {
  margin-top: 4px;
}
.mode-link {
  display: flex;
  justify-content: center;
  gap: 6px;
  margin: 26px 0 0;
  color: var(--color-text-secondary);
  font-size: 0.875rem;
  button {
    font-weight: 650;
  }
}
.captcha-field {
  display: flex;
  gap: 8px;
  input {
    flex: 1;
  }
}
.captcha-image {
  display: grid;
  flex: 0 0 116px;
  height: 48px;
  overflow: hidden;
  place-items: center;
  background: var(--color-surface) !important;
  border: 1px solid var(--color-border) !important;
  border-radius: 8px;
  img {
    display: block;
    width: 100%;
    height: 100%;
  }
  span {
    font-size: 0.75rem;
  }
}
.auth-footer {
  padding: 44px 0 24px;
  text-align: center;
  color: var(--color-text-tertiary);
  font-size: 0.75rem;
}
@media (min-width: 600px) {
  .auth-shell {
    padding-top: 6vh;
  }
}
@media (max-height: 650px) {
  .auth-header {
    min-height: 64px;
  }
  .auth-content {
    padding-top: 8px;
  }
  .reset-steps {
    display: flex;
    gap: 12px;
    margin: -12px 0 28px;
    color: var(--color-text-tertiary);
    font-size: 0.8125rem;
    .active {
      color: var(--color-text-primary);
      font-weight: 650;
    }
  }
  .verified-email {
    display: grid;
    gap: 6px;
    margin-bottom: 24px;
    font-size: 0.875rem;
    span {
      color: var(--color-text-secondary);
    }
    strong {
      overflow-wrap: anywhere;
    }
  }
  .auth-subtitle {
    margin-bottom: 24px;
  }
  .auth-footer {
    padding-top: 28px;
  }
}
</style>
