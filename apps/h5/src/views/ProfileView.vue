<script setup lang="ts">
import { Button, Tag } from 'tdesign-mobile-vue';
import { ActivityIcon, LogoutIcon } from 'tdesign-icons-vue-next';
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
      <span class="page-header__eyebrow">Profile</span>
      <h1>我的</h1>
      <p>管理你的 FitTrace 账户。</p>
    </header>
    <section class="surface-card profile-card">
      <div class="avatar">
        {{ (auth.user?.nickname || auth.user?.email || 'F').slice(0, 1).toUpperCase() }}
      </div>
      <div class="profile-card__body">
        <strong>{{ auth.user?.nickname || 'FitTrace 用户' }}</strong>
        <span>{{ auth.user?.email }}</span>
        <Tag theme="primary" variant="light">V0.1</Tag>
      </div>
    </section>
    <section class="surface-card athlete-card">
      <ActivityIcon />
      <div>
        <strong>持续记录，积累你的运动档案</strong><span>更多训练与饮食能力将在后续阶段开放。</span>
      </div>
    </section>
    <Button
      class="logout-button"
      theme="default"
      variant="outline"
      block
      size="large"
      @click="logout"
    >
      <LogoutIcon /> 退出登录
    </Button>
  </main>
</template>

<style scoped lang="scss">
.profile-card {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: 16px;

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
  color: var(--color-ink);
  font-size: 1.25rem;
  font-weight: 800;
  background: var(--color-primary);
  border-radius: 14px;
  box-shadow: 4px 4px 0 var(--color-ink);
}

.athlete-card {
  display: flex;
  align-items: center;
  gap: 13px;
  margin-top: 12px;
  padding: 16px;
  color: #fff;
  background: var(--color-ink);

  > svg {
    flex: none;
    color: var(--color-primary);
    font-size: 1.7rem;
  }

  div {
    display: grid;
    gap: 4px;
  }

  strong {
    font-size: 0.82rem;
  }

  span {
    color: rgb(255 255 255 / 48%);
    font-size: 0.68rem;
    line-height: 1.5;
  }
}

.logout-button {
  margin-top: var(--spacing-md);
}
</style>
