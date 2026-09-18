<script setup lang="ts">
import { Button, Card, Tag } from 'tdesign-vue-next';
import { useRouter } from 'vue-router';

const router = useRouter();
const entries = [
  { title: '身体数据', description: '体重、体脂和身体围度', symbol: 'kg', enabled: true },
  { title: '饮食记录', description: '记录每一餐和食物', symbol: '餐', enabled: false },
  { title: '训练记录', description: '保存训练类型和时长', symbol: '练', enabled: false },
  { title: '身材照片', description: '留下不同阶段的变化', symbol: '照', enabled: false },
];
</script>

<template>
  <main class="view-page">
    <header class="page-header">
      <span class="page-header__eyebrow">QUICK LOG</span>
      <h1>记录</h1>
      <p>选择你现在要记录的内容。</p>
    </header>

    <div class="entry-list">
      <Card
        v-for="entry in entries"
        :key="entry.title"
        class="surface-card entry-card"
        :bordered="false"
      >
        <div class="entry-card__symbol">{{ entry.symbol }}</div>
        <div class="entry-card__content">
          <div class="entry-card__title">
            <strong>{{ entry.title }}</strong>
            <Tag v-if="!entry.enabled" size="small" variant="light">即将开放</Tag>
          </div>
          <span>{{ entry.description }}</span>
        </div>
        <Button
          :theme="entry.enabled ? 'primary' : 'default'"
          :disabled="!entry.enabled"
          shape="round"
          @click="router.push('/body/create')"
        >
          {{ entry.enabled ? '去记录' : '暂不可用' }}
        </Button>
      </Card>
    </div>

    <Button variant="text" block size="large" @click="router.push('/body/history')">
      查看身体数据历史
    </Button>
  </main>
</template>

<style scoped lang="scss">
.entry-list {
  display: grid;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-md);
}

.entry-card {
  :deep(.t-card__body) {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px;
  }

  &__symbol {
    display: grid;
    width: 44px;
    height: 44px;
    flex: none;
    place-items: center;
    color: var(--color-primary);
    font-size: 0.82rem;
    font-weight: 800;
    background: var(--color-primary-light);
    border-radius: 14px;
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
</style>
