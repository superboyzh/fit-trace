<script setup lang="ts">
import { Button, Card, Tag } from 'tdesign-vue-next';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const router = useRouter();

async function logout(): Promise<void> {
  auth.logout();
  await router.replace('/login');
}
</script>

<template>
  <main class="view-page">
    <header class="page-header">
      <span class="page-header__eyebrow">PROFILE</span>
      <h1>我的</h1>
      <p>管理你的 FitTrace 账户。</p>
    </header>
    <Card class="surface-card profile-card" :bordered="false">
      <div class="avatar">
        {{ (auth.user?.nickname || auth.user?.email || 'F').slice(0, 1).toUpperCase() }}
      </div>
      <div class="profile-card__body">
        <strong>{{ auth.user?.nickname || 'FitTrace 用户' }}</strong>
        <span>{{ auth.user?.email }}</span>
        <Tag theme="primary" variant="light">V0.1</Tag>
      </div>
    </Card>
    <Button
      class="logout-button"
      theme="default"
      variant="outline"
      block
      size="large"
      @click="logout"
    >
      退出登录
    </Button>
  </main>
</template>

<style scoped lang="scss">
.profile-card {
  :deep(.t-card__body) {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
  }

  &__body {
    display: flex;
    min-width: 0;
    flex: 1;
    flex-direction: column;
    align-items: flex-start;
    gap: 5px;

    strong {
      font-size: 1rem;
    }

    span:not(.t-tag) {
      overflow: hidden;
      max-width: 100%;
      color: var(--color-text-secondary);
      font-size: 0.8rem;
      text-overflow: ellipsis;
    }
  }
}

.avatar {
  display: grid;
  width: 56px;
  height: 56px;
  flex: none;
  place-items: center;
  color: #fff;
  font-size: 1.25rem;
  font-weight: 800;
  background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
  border-radius: 18px;
}

.logout-button {
  margin-top: var(--spacing-md);
}
</style>
