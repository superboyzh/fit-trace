<script setup lang="ts">
import type { ApiErrorResponse } from '@fit-trace/shared';
import axios from 'axios';
import { Alert, Button, Input } from 'tdesign-vue-next';
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();
const mode = ref<'login' | 'register'>('login');
const email = ref('');
const password = ref('');
const nickname = ref('');
const submitting = ref(false);
const errorMessage = ref('');
const title = computed(() => (mode.value === 'login' ? '欢迎回来' : '开始记录改变'));

function switchMode(nextMode: 'login' | 'register'): void {
  mode.value = nextMode;
  errorMessage.value = '';
}

async function submit(): Promise<void> {
  if (submitting.value) return;
  errorMessage.value = '';
  if (!email.value.trim()) {
    errorMessage.value = '请输入邮箱地址';
    return;
  }
  if (password.value.length < 8) {
    errorMessage.value = '密码至少需要 8 位';
    return;
  }
  submitting.value = true;

  try {
    if (mode.value === 'login') {
      await auth.login({ email: email.value, password: password.value });
    } else {
      await auth.register({
        email: email.value,
        password: password.value,
        ...(nickname.value.trim() ? { nickname: nickname.value.trim() } : {}),
      });
    }
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/dashboard';
    await router.replace(redirect);
  } catch (error) {
    errorMessage.value = axios.isAxiosError<ApiErrorResponse>(error)
      ? (error.response?.data.message ?? '请求失败，请稍后重试')
      : '请求失败，请稍后重试';
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <main class="auth-page">
    <section class="auth-card">
      <span class="auth-card__brand">FITTRACE</span>
      <h1>{{ title }}</h1>
      <p>持续记录，才能看见真正的趋势。</p>

      <div class="mode-switch" aria-label="账户操作">
        <Button
          type="button"
          :theme="mode === 'login' ? 'primary' : 'default'"
          :variant="mode === 'login' ? 'base' : 'text'"
          @click="switchMode('login')"
        >
          登录
        </Button>
        <Button
          type="button"
          :theme="mode === 'register' ? 'primary' : 'default'"
          :variant="mode === 'register' ? 'base' : 'text'"
          @click="switchMode('register')"
        >
          注册
        </Button>
      </div>

      <form @submit.prevent="submit">
        <label v-if="mode === 'register'">
          <span>昵称（可选）</span>
          <Input
            v-model="nickname"
            autocomplete="nickname"
            :maxlength="40"
            size="large"
            clearable
            placeholder="怎么称呼你"
          />
        </label>
        <label>
          <span>邮箱</span>
          <Input
            v-model="email"
            autocomplete="email"
            size="large"
            clearable
            placeholder="name@example.com"
          />
        </label>
        <label>
          <span>密码</span>
          <Input
            v-model="password"
            type="password"
            :autocomplete="mode === 'login' ? 'current-password' : 'new-password'"
            :maxlength="72"
            size="large"
            clearable
            placeholder="至少 8 位"
          />
        </label>

        <Alert v-if="errorMessage" theme="error" :message="errorMessage" />
        <Button
          class="submit-button"
          type="submit"
          theme="primary"
          size="large"
          block
          :loading="submitting"
        >
          {{ mode === 'login' ? '登录' : '创建账户' }}
        </Button>
      </form>
    </section>
  </main>
</template>

<style scoped lang="scss">
.auth-page {
  display: grid;
  min-height: 100vh;
  place-items: center;
  padding: var(--spacing-lg) var(--spacing-md);
  background:
    radial-gradient(circle at 18% 12%, rgb(20 108 91 / 17%), transparent 38%),
    var(--color-background);
}

.auth-card {
  width: min(100%, 420px);
  padding: 32px 24px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow-card);

  &__brand {
    color: var(--color-primary);
    font-size: 0.75rem;
    font-weight: 800;
    letter-spacing: 0.14em;
  }

  h1 {
    margin: var(--spacing-sm) 0;
    font-size: 1.75rem;
  }

  > p {
    margin: 0 0 var(--spacing-lg);
    color: var(--color-text-secondary);
  }
}

.mode-switch {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 4px;
  margin-bottom: var(--spacing-lg);
  padding: 4px;
  background: var(--color-background);
  border-radius: 10px;

  :deep(.t-button) {
    width: 100%;
    border-radius: 8px;
  }
}

form,
label {
  display: grid;
}

form {
  gap: var(--spacing-md);
}

label {
  gap: 7px;

  span {
    font-size: 0.8rem;
    font-weight: 600;
  }
}

:deep(.t-input) {
  width: 100%;
}

.submit-button {
  margin-top: 2px;
}
</style>
