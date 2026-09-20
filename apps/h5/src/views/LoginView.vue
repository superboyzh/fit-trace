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
      <div class="auth-hero__copy">
        <span>BUILD YOUR TRACE</span>
        <h1>记录行动，<br />看见改变。</h1>
        <p>身体、饮食与训练，汇成属于你的长期轨迹。</p>
      </div>
      <svg class="pulse-line" viewBox="0 0 400 70" preserveAspectRatio="none" aria-hidden="true">
        <polyline
          points="0,45 72,45 94,45 110,8 128,62 148,31 163,45 230,45 250,45 268,20 285,52 302,45 400,45"
        />
      </svg>
    </section>
    <section class="auth-card">
      <span class="auth-card__eyebrow">MEMBER ACCESS</span>
      <h2>{{ title }}</h2>
      <p>登录后继续你的运动记录。</p>

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
        <Button
          class="submit-button"
          type="submit"
          theme="primary"
          size="large"
          block
          :loading="submitting"
        >
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
  min-height: 330px;
  padding: 28px 24px 78px;
  color: #fff;
  background:
    radial-gradient(circle at 86% 16%, rgb(184 242 61 / 15%), transparent 30%), var(--color-ink);

  &::after {
    position: absolute;
    right: -38px;
    bottom: -72px;
    width: 180px;
    height: 180px;
    border: 34px solid rgb(184 242 61 / 8%);
    border-radius: 50%;
    content: '';
  }

  &__copy {
    position: relative;
    z-index: 1;
    margin-top: 58px;

    > span {
      color: var(--color-primary);
      font-size: 0.62rem;
      font-weight: 850;
      letter-spacing: 0.2em;
    }

    h1 {
      margin: 8px 0 10px;
      font-size: 2.5rem;
      font-weight: 900;
      line-height: 1.08;
      letter-spacing: -0.06em;
    }

    p {
      max-width: 290px;
      margin: 0;
      color: rgb(255 255 255 / 52%);
      font-size: 0.76rem;
      line-height: 1.65;
    }
  }
}

.brand-lockup {
  display: flex;
  align-items: center;
  gap: 9px;
  font-size: 0.72rem;
  font-weight: 900;
  letter-spacing: 0.18em;
}

.brand-mark {
  display: flex;
  height: 18px;
  align-items: flex-end;
  gap: 2px;

  i {
    display: block;
    width: 4px;
    background: var(--color-primary);
    transform: skewX(-12deg);

    &:nth-child(1) {
      height: 9px;
    }

    &:nth-child(2) {
      height: 14px;
    }

    &:nth-child(3) {
      height: 18px;
    }
  }
}

.pulse-line {
  position: absolute;
  right: 0;
  bottom: 8px;
  left: 0;
  width: 100%;
  height: 70px;

  polyline {
    fill: none;
    stroke: var(--color-primary);
    stroke-linejoin: round;
    stroke-width: 2;
    vector-effect: non-scaling-stroke;
  }
}

.auth-card {
  position: relative;
  z-index: 2;
  width: calc(100% - 32px);
  margin: -42px auto 0;
  padding: 24px 22px 26px;
  background: var(--color-surface);
  border: 1px solid rgb(17 23 21 / 6%);
  border-radius: 16px;
  box-shadow: var(--shadow-card);

  &__eyebrow {
    color: var(--color-text-tertiary);
    font-size: 0.6rem;
    font-weight: 800;
    letter-spacing: 0.17em;
  }

  h2 {
    margin: 6px 0 4px;
    font-size: 1.5rem;
    font-weight: 850;
    letter-spacing: -0.04em;
  }

  > p {
    margin: 0 0 20px;
    color: var(--color-text-secondary);
    font-size: 0.78rem;
  }
}

.mode-switch {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 4px;
  margin-bottom: var(--spacing-lg);
  padding: 4px;
  background: var(--color-surface-muted);
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

  &.t-button {
    color: var(--color-ink);
    background: var(--color-primary);
    border-color: var(--color-primary);
  }

  &.t-button--disabled {
    color: var(--color-ink);
    background: var(--color-primary);
    border-color: var(--color-primary);
    opacity: 0.78;
  }
}

@media (min-width: 560px) {
  .auth-page {
    display: grid;
    width: min(100%, 920px);
    min-height: 680px;
    grid-template-columns: 1.05fr 0.95fr;
    align-items: center;
    margin: 5vh auto;
    overflow: hidden;
    background: #fff;
    border-radius: 22px;
    box-shadow: 0 30px 70px rgb(17 23 21 / 16%);
  }

  .auth-hero {
    min-height: 100%;
    padding: 36px;

    &__copy {
      margin-top: 120px;
    }
  }

  .auth-card {
    width: auto;
    margin: 0 36px;
    border: 0;
    box-shadow: none;
  }
}
</style>
