<script setup lang="ts">
import { Button, Tag } from 'tdesign-mobile-vue';
import {
  ActivityIcon,
  CameraIcon,
  ChevronRightIcon,
  ForkIcon,
  MeasurementIcon,
} from 'tdesign-icons-vue-next';
import { useRouter } from 'vue-router';

const router = useRouter();
const entries = [
  {
    title: '身体数据',
    description: '体重、体脂和身体围度',
    icon: MeasurementIcon,
    path: '/body/create',
    enabled: true,
  },
  {
    title: '饮食记录',
    description: '记录每一餐和食物',
    icon: ForkIcon,
    path: '/meals/create',
    enabled: true,
  },
  { title: '训练记录', description: '保存训练类型和强度', icon: ActivityIcon, enabled: false },
  { title: '身材照片', description: '留下不同阶段的变化', icon: CameraIcon, enabled: false },
];
</script>

<template>
  <main class="view-page">
    <header class="page-header">
      <span class="page-header__eyebrow">Quick Log</span>
      <h1>记录训练轨迹</h1>
      <p>选择记录类型，用最少的步骤留下今天的数据。</p>
    </header>

    <div class="entry-list">
      <section v-for="entry in entries" :key="entry.title" class="surface-card entry-card">
        <div class="entry-card__symbol"><component :is="entry.icon" /></div>
        <div class="entry-card__content">
          <div class="entry-card__title">
            <strong>{{ entry.title }}</strong>
            <Tag v-if="!entry.enabled" size="small" variant="light">即将开放</Tag>
          </div>
          <span>{{ entry.description }}</span>
        </div>
        <Button
          variant="text"
          :disabled="!entry.enabled"
          shape="round"
          @click="entry.path && router.push(entry.path)"
        >
          <ChevronRightIcon />
        </Button>
      </section>
    </div>

    <div class="history-links">
      <Button variant="text" block @click="router.push('/body/history')">身体数据历史</Button>
      <Button variant="text" block @click="router.push('/meals')">饮食记录历史</Button>
    </div>
  </main>
</template>

<style scoped lang="scss">
.entry-list {
  display: grid;
  gap: 10px;
  margin-bottom: var(--spacing-md);
}

.entry-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 17px 15px;

  &__symbol {
    display: grid;
    width: 46px;
    height: 46px;
    flex: none;
    place-items: center;
    color: var(--color-ink);
    font-size: 1.25rem;
    background: var(--color-primary);
    border-radius: 12px;
  }

  &__content {
    display: flex;
    min-width: 0;
    flex: 1;
    flex-direction: column;
    gap: 4px;

    > span {
      color: var(--color-text-secondary);
      font-size: 0.76rem;
    }
  }

  &__title {
    display: flex;
    align-items: center;
    gap: 7px;
  }

  &:has(.t-button:disabled) {
    opacity: 0.54;

    .entry-card__symbol {
      background: var(--color-surface-muted);
    }
  }
}

.history-links {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
}
</style>
