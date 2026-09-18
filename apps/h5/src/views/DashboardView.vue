<script setup lang="ts">
import type { BodyRecord } from '@fit-trace/shared';
import dayjs from 'dayjs';
import { Button, Card, Skeleton, Tag } from 'tdesign-vue-next';
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { getBodyRecords } from '@/api/body-records';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const router = useRouter();
const loading = ref(true);
const records = ref<BodyRecord[]>([]);
const latest = computed(() => records.value[0] ?? null);
const previous = computed(() => records.value[1] ?? null);
const displayName = computed(
  () => auth.user?.nickname || auth.user?.email?.split('@')[0] || '朋友',
);
const todayLabel = dayjs().format('M 月 D 日 · dddd');
const weightChange = computed(() => {
  if (!latest.value || !previous.value) return null;
  const value = latest.value.weight - previous.value.weight;
  return `${value > 0 ? '+' : ''}${value.toFixed(1)} kg`;
});

onMounted(async () => {
  try {
    const result = await getBodyRecords({ page: 1, pageSize: 2 });
    records.value = result.data;
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <main class="dashboard">
    <header class="dashboard-header">
      <div>
        <span>{{ todayLabel }}</span>
        <h1>你好，{{ displayName }}</h1>
      </div>
      <div class="dashboard-header__avatar">{{ displayName.slice(0, 1).toUpperCase() }}</div>
    </header>

    <Skeleton v-if="loading" :loading="true" animation="gradient" :row-col="[1, 1, 1]" />

    <template v-else>
      <Card class="weight-card" :bordered="false">
        <div class="weight-card__top">
          <div>
            <span>最近体重</span>
            <div v-if="latest" class="weight-card__value">
              <strong>{{ latest.weight }}</strong
              ><small>kg</small>
            </div>
            <div v-else class="weight-card__empty">还没有记录</div>
          </div>
          <Tag v-if="weightChange" theme="success" variant="light">较上次 {{ weightChange }}</Tag>
          <Tag v-else variant="light">身体数据</Tag>
        </div>
        <div v-if="latest" class="weight-card__meta">
          <span>{{ dayjs(latest.recordedAt).format('YYYY年M月D日 HH:mm') }}</span>
          <span v-if="latest.bodyFat !== null">体脂 {{ latest.bodyFat }}%</span>
          <span v-if="latest.waist !== null">腰围 {{ latest.waist }}cm</span>
        </div>
        <div class="weight-card__actions">
          <Button theme="primary" size="large" @click="router.push('/body/create')">
            {{ latest ? '记录新数据' : '开始记录' }}
          </Button>
          <Button variant="outline" size="large" @click="router.push('/body/history')"
            >历史记录</Button
          >
        </div>
      </Card>

      <section class="section-block">
        <div class="section-heading">
          <div>
            <span>DAILY TRACE</span>
            <h2>今天记录什么？</h2>
          </div>
        </div>
        <div class="quick-grid">
          <Card
            class="quick-card quick-card--active"
            :bordered="false"
            @click="router.push('/body/create')"
          >
            <div class="quick-card__icon">kg</div>
            <strong>身体数据</strong>
            <span>体重与围度</span>
          </Card>
          <Card class="quick-card" :bordered="false">
            <div class="quick-card__icon">餐</div>
            <strong>饮食</strong>
            <span>下一阶段开放</span>
          </Card>
          <Card class="quick-card" :bordered="false">
            <div class="quick-card__icon">练</div>
            <strong>训练</strong>
            <span>即将开放</span>
          </Card>
          <Card class="quick-card" :bordered="false">
            <div class="quick-card__icon">照</div>
            <strong>身材照片</strong>
            <span>即将开放</span>
          </Card>
        </div>
      </section>
    </template>
  </main>
</template>

<style scoped lang="scss">
.dashboard {
  min-height: 100vh;
  padding: 0 var(--spacing-md) var(--spacing-xl);
}

.dashboard-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28px 0 22px;

  span {
    color: var(--color-text-secondary);
    font-size: 0.74rem;
  }

  h1 {
    margin: 4px 0 0;
    font-size: 1.55rem;
  }

  &__avatar {
    display: grid;
    width: 42px;
    height: 42px;
    place-items: center;
    color: #fff;
    font-weight: 800;
    background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
    border-radius: 14px;
    box-shadow: 0 8px 20px rgb(20 108 91 / 22%);
  }
}

.weight-card {
  color: #fff;
  background:
    radial-gradient(circle at 88% 12%, rgb(255 255 255 / 18%), transparent 28%),
    linear-gradient(145deg, #0e5d4f, #19836e);
  border-radius: 22px;
  box-shadow: 0 18px 38px rgb(14 93 79 / 23%);

  :deep(.t-card__body) {
    padding: 22px;
  }

  &__top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--spacing-sm);

    > div > span {
      font-size: 0.76rem;
      opacity: 0.75;
    }
  }

  &__value {
    display: flex;
    align-items: baseline;
    gap: 6px;
    margin-top: 5px;

    strong {
      font-size: 2.8rem;
      line-height: 1;
    }

    small {
      font-size: 0.9rem;
      opacity: 0.72;
    }
  }

  &__empty {
    margin-top: 8px;
    font-size: 1.5rem;
    font-weight: 750;
  }

  &__meta {
    display: flex;
    flex-wrap: wrap;
    gap: 7px 15px;
    margin-top: 17px;
    font-size: 0.72rem;
    opacity: 0.72;
  }

  &__actions {
    display: grid;
    grid-template-columns: 1.25fr 1fr;
    gap: 10px;
    margin-top: 22px;

    :deep(.t-button--theme-primary) {
      color: var(--color-primary);
      background: #fff;
      border-color: #fff;
    }

    :deep(.t-button--variant-outline) {
      color: #fff;
      background: transparent;
      border-color: rgb(255 255 255 / 36%);
    }
  }
}

.section-block {
  margin-top: 28px;
}

.section-heading {
  margin-bottom: 12px;

  span {
    color: var(--color-primary);
    font-size: 0.66rem;
    font-weight: 800;
    letter-spacing: 0.12em;
  }

  h2 {
    margin: 3px 0 0;
    font-size: 1.05rem;
  }
}

.quick-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.quick-card {
  cursor: default;

  :deep(.t-card__body) {
    display: flex;
    min-height: 132px;
    flex-direction: column;
    align-items: flex-start;
    padding: 15px;
  }

  &--active {
    cursor: pointer;
  }

  &__icon {
    display: grid;
    width: 34px;
    height: 34px;
    margin-bottom: auto;
    place-items: center;
    color: var(--color-primary);
    font-size: 0.72rem;
    font-weight: 800;
    background: var(--color-primary-light);
    border-radius: 11px;
  }

  strong {
    margin-top: 16px;
    font-size: 0.86rem;
  }

  span {
    margin-top: 3px;
    color: var(--color-text-tertiary);
    font-size: 0.7rem;
  }
}
</style>
