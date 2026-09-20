<script setup lang="ts">
import type { ApiErrorResponse } from '@fit-trace/shared';
import axios from 'axios';
import { Button, Input, NoticeBar } from 'tdesign-mobile-vue';
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();
const mode = ref<'login' | 'register'>('login');
const email = ref('1431814914@qq.com');
const password = ref('');
const nickname = ref('');
const submitting = ref(false);
const errorMessage = ref('');
const title = computed(() => (mode.value === 'login' ? '欢迎回来' : '开始记录改变'));
const subtitle = computed(() =>
  mode.value === 'login' ? '登录后继续你的记录。' : '创建账户，从今天的第一条记录开始。',
);

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
    <section class="auth-hero">
      <div class="brand-lockup">
        <span class="brand-mark"><i></i><i></i><i></i></span>
        <span>FITTRACE</span>
      </div>
      <h1>记录行动，<br />看见改变。</h1>
      <p>身体、饮食与训练，汇成属于你的长期轨迹。</p>
    </section>

    <section class="auth-card">
      <h2>{{ title }}</h2>
      <p>{{ subtitle }}</p>

      <div class="mode-switch" aria-label="账户操作">
        <button type="button" :class="{ active: mode === 'login' }" @click="switchMode('login')">
          登录
        </button>
        <button
          type="button"
          :class="{ active: mode === 'register' }"
          @click="switchMode('register')"
        >
          注册
        </button>
      </div>

      <form @submit.prevent="submit">
        <label v-if="mode === 'register'">
          <span>昵称（可选）</span>
          <Input
            v-model="nickname"
            autocomplete="nickname"
            :maxlength="40"
            clearable
            placeholder="怎么称呼你"
          />
        </label>
        <label>
          <span>邮箱</span>
          <Input v-model="email" autocomplete="email" clearable placeholder="name@example.com" />
        </label>
        <label>
          <span>密码</span>
          <Input
            v-model="password"
            type="password"
            :autocomplete="mode === 'login' ? 'current-password' : 'new-password'"
            :maxlength="72"
            clearable
            placeholder="至少 8 位"
          />
        </label>

        <NoticeBar v-if="errorMessage" theme="error" :content="errorMessage" />
        <Button class="submit-button" type="submit" size="large" block :loading="submitting">
          {{ submitting ? '请稍候…' : mode === 'login' ? '登录' : '创建账户' }}
        </Button>
      </form>
    </section>
  </main>
</template>

<style scoped lang="scss">
.auth-page {
  min-height: 100vh;
  background: var(--color-background);
}

.auth-hero {
  position: relative;
  overflow: hidden;
  padding: 26px 22px 64px;
  color: #fff;
  background:
    radial-gradient(circle at 88% 12%, rgb(168 221 53 / 13%), transparent 34%), var(--color-ink);

  h1 {
    margin: 44px 0 10px;
    font-size: 2rem;
    font-weight: 850;
    line-height: 1.14;
    letter-spacing: -0.05em;
  }

  p {
    max-width: 280px;
    margin: 0;
    color: rgb(255 255 255 / 52%);
    font-size: 0.76rem;
    line-height: 1.7;
  }
}

.brand-lockup {
  display: flex;
  align-items: center;
  gap: 9px;
  font-size: 0.7rem;
  font-weight: 850;
  letter-spacing: 0.18em;
}

.brand-mark {
  display: flex;
  height: 16px;
  align-items: flex-end;
  gap: 2px;

  i {
    display: block;
    width: 4px;
    background: var(--color-primary);
    transform: skewX(-12deg);

    &:nth-child(1) {
      height: 8px;
    }

    &:nth-child(2) {
      height: 12px;
    }

    &:nth-child(3) {
      height: 16px;
    }
  }
}

.auth-card {
  position: relative;
  z-index: 2;
  width: calc(100% - 32px);
  margin: -38px auto 24px;
  padding: 22px 20px 24px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow-card);

  h2 {
    margin: 0 0 4px;
    font-size: 1.35rem;
    font-weight: 850;
    letter-spacing: -0.04em;
  }

  > p {
    margin: 0 0 18px;
    color: var(--color-text-secondary);
    font-size: 0.74rem;
  }
}

.mode-switch {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px;
  margin-bottom: var(--spacing-lg);

  button {
    padding: 9px 4px;
    color: var(--color-text-secondary);
    font-size: 0.72rem;
    font-weight: 750;
    background: transparent;
    border: 1px solid var(--color-border);
    border-radius: 8px;

    &.active {
      color: var(--color-ink);
      background: var(--color-primary-light);
      border-color: #d7e9ad;
    }
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
    color: var(--color-text-secondary);
    font-size: 0.72rem;
    font-weight: 750;
  }
}

:deep(.t-input) {
  width: 100%;
}

.submit-button {
  margin-top: 2px;
}

@media (min-width: 560px) {
  .auth-page {
    display: grid;
    width: min(100%, 880px);
    min-height: 620px;
    grid-template-columns: 1.05fr 0.95fr;
    align-items: center;
    margin: 5vh auto;
    overflow: hidden;
    background: #fff;
    border-radius: 20px;
    box-shadow: 0 28px 64px rgb(17 23 21 / 14%);
  }

  .auth-hero {
    min-height: 100%;
    padding: 34px;

    h1 {
      margin-top: 110px;
    }
  }

  .auth-card {
    width: auto;
    margin: 0 34px;
    border: 0;
    box-shadow: none;
  }
}
</style>
