<script setup lang="ts">
import { Button } from 'tdesign-mobile-vue';
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
  },
  {
    title: '饮食记录',
    description: '记录每一餐和食物',
    icon: ForkIcon,
    path: '/meals/create',
  },
  {
    title: '训练记录',
    description: '训练类型、时长与消耗',
    icon: ActivityIcon,
    path: '/workouts/create',
  },
  {
    title: '身材照片',
    description: '留下不同阶段的变化',
    icon: CameraIcon,
    path: '/photos',
  },
];
const shortcuts = [
  { label: '身体数据历史', path: '/body/history' },
  { label: '饮食日记', path: '/meals' },
  { label: '训练记录', path: '/workouts' },
  { label: '照片档案', path: '/photos' },
  { label: '全部记录档案', path: '/archive' },
];
</script>

<template>
  <main class="view-page">
    <header class="page-header">
      <h1>添加记录</h1>
      <p>选择今天想要记录的内容。</p>
    </header>

    <div class="entry-list">
      <section v-for="entry in entries" :key="entry.title" class="surface-card entry-card">
        <div class="entry-card__symbol"><component :is="entry.icon" /></div>
        <div class="entry-card__content">
          <div class="entry-card__title">
            <strong>{{ entry.title }}</strong>
          </div>
          <span>{{ entry.description }}</span>
        </div>
        <Button variant="text" shape="round" @click="router.push(entry.path)">
          <ChevronRightIcon />
        </Button>
      </section>
    </div>

    <section class="surface-card shortcut-card">
      <button
        v-for="shortcut in shortcuts"
        :key="shortcut.path + shortcut.label"
        type="button"
        @click="router.push(shortcut.path)"
      >
        <span>{{ shortcut.label }}</span>
        <ChevronRightIcon />
      </button>
    </section>
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
    background: var(--color-primary-light);
    border-radius: 10px;
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
}

.shortcut-card {
  margin-top: var(--spacing-md);

  button {
    display: flex;
    width: 100%;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 14px 15px;
    color: var(--color-text-primary);
    text-align: left;
    background: transparent;
    border: 0;

    + button {
      border-top: 1px solid var(--color-border);
    }

    span {
      font-size: 0.76rem;
      font-weight: 700;
    }

    svg {
      flex: none;
      color: var(--color-text-tertiary);
    }
  }
}
</style>
