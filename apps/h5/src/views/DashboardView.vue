<script setup lang="ts">
import type { BodyRecord } from '@fit-trace/shared';
import dayjs from 'dayjs';
import { Button, Skeleton, Tag } from 'tdesign-mobile-vue';
import {
  ActivityIcon,
  CameraIcon,
  ChevronRightIcon,
  ForkIcon,
  MeasurementIcon,
} from 'tdesign-icons-vue-next';
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
const oldest = computed(() => records.value.at(-1) ?? null);
const displayName = computed(
  () => auth.user?.nickname || auth.user?.email?.split('@')[0] || '朋友',
);
const todayLabel = dayjs().format('M月D日 dddd');
const greeting = computed(() => {
  const hour = dayjs().hour();
  if (hour < 11) return '早上好';
  if (hour < 14) return '中午好';
  if (hour < 18) return '下午好';
  return '晚上好';
});
const weightChange = computed(() => {
  if (!latest.value || !previous.value) return null;
  return latest.value.weight - previous.value.weight;
});
const periodChange = computed(() => {
  if (!latest.value || !oldest.value || latest.value.id === oldest.value.id) return null;
  return latest.value.weight - oldest.value.weight;
});
const chartPoints = computed(() => {
  const values = [...records.value].reverse().map((item) => item.weight);
  if (values.length < 2) return '10,58 290,58';
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  return values
    .map((value, index) => {
      const x = 10 + (index / (values.length - 1)) * 280;
      const y = 66 - ((value - min) / range) * 52;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
});
const quickEntries = [
  {
    title: '身体',
    subtitle: '体重与围度',
    icon: MeasurementIcon,
    path: '/body/create',
    enabled: true,
  },
  {
    title: '饮食',
    subtitle: '记录每一餐',
    icon: ForkIcon,
    path: '/meals/create',
    enabled: true,
  },
  { title: '训练', subtitle: '组数与强度', icon: ActivityIcon, enabled: false },
  { title: '照片', subtitle: '追踪身材变化', icon: CameraIcon, enabled: false },
];

onMounted(async () => {
  try {
    const result = await getBodyRecords({ page: 1, pageSize: 30 });
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
        <h1>{{ greeting }}，{{ displayName }}</h1>
        <p>保持记录，看见每一次进步。</p>
      </div>
      <button class="dashboard-header__avatar" type="button" @click="router.push('/profile')">
        {{ displayName.slice(0, 1).toUpperCase() }}
      </button>
    </header>

    <Skeleton v-if="loading" :loading="true" animation="gradient" :row-col="[1, 1, 1]" />

    <template v-else>
      <section class="performance-card">
        <div class="performance-card__header">
          <div>
            <span>BODY PERFORMANCE</span>
            <strong>身体趋势</strong>
          </div>
          <Tag variant="outline">最近 30 条</Tag>
        </div>

        <div class="performance-card__summary">
          <div>
            <span>当前体重</span>
            <div v-if="latest" class="performance-card__weight metric-number">
              {{ latest.weight }}<small>kg</small>
            </div>
            <div v-else class="performance-card__empty">等待首次记录</div>
          </div>
          <div v-if="weightChange !== null" class="change-pill" :class="{ up: weightChange > 0 }">
            {{ weightChange > 0 ? '↑' : '↓' }} {{ Math.abs(weightChange).toFixed(1) }} kg
            <small>较上次</small>
          </div>
        </div>

        <div class="trend-chart" aria-hidden="true">
          <svg viewBox="0 0 300 80" preserveAspectRatio="none">
            <defs>
              <linearGradient id="trendArea" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stop-color="#b8f23d" stop-opacity=".28" />
                <stop offset="1" stop-color="#b8f23d" stop-opacity="0" />
              </linearGradient>
            </defs>
            <line x1="0" y1="68" x2="300" y2="68" class="trend-chart__grid" />
            <polyline
              :points="`10,68 ${chartPoints} 290,68`"
              fill="url(#trendArea)"
              stroke="none"
            />
            <polyline :points="chartPoints" class="trend-chart__line" />
          </svg>
        </div>

        <div class="performance-card__footer">
          <div>
            <span>阶段变化</span>
            <strong class="metric-number">
              {{
                periodChange === null
                  ? '—'
                  : `${periodChange > 0 ? '+' : ''}${periodChange.toFixed(1)} kg`
              }}
            </strong>
          </div>
          <div>
            <span>体脂率</span>
            <strong class="metric-number">{{
              latest?.bodyFat ? `${latest.bodyFat}%` : '—'
            }}</strong>
          </div>
          <div>
            <span>腰围</span>
            <strong class="metric-number">{{ latest?.waist ? `${latest.waist} cm` : '—' }}</strong>
          </div>
        </div>

        <Button
          class="performance-card__action"
          block
          size="large"
          @click="router.push('/body/create')"
        >
          {{ latest ? '记录今日数据' : '开始第一次记录' }}
        </Button>
      </section>

      <section class="dashboard-section">
        <div class="section-title">
          <div>
            <span>QUICK LOG</span>
            <h2>今天记录什么？</h2>
          </div>
          <Button variant="text" size="small" @click="router.push('/record')">
            全部 <ChevronRightIcon />
          </Button>
        </div>
        <div class="quick-grid">
          <button
            v-for="entry in quickEntries"
            :key="entry.title"
            class="quick-entry"
            :class="{ disabled: !entry.enabled }"
            type="button"
            :disabled="!entry.enabled"
            @click="entry.path && router.push(entry.path)"
          >
            <span class="quick-entry__icon"><component :is="entry.icon" /></span>
            <strong>{{ entry.title }}</strong>
            <small>{{ entry.enabled ? entry.subtitle : '即将开放' }}</small>
          </button>
        </div>
      </section>

      <section class="dashboard-section weekly-section">
        <div class="section-title">
          <div>
            <span>THIS WEEK</span>
            <h2>本周状态</h2>
          </div>
        </div>
        <div class="weekly-card">
          <div class="weekly-card__score">
            <strong>{{ records.length }}</strong
            ><span>身体记录</span>
          </div>
          <div><strong>—</strong><span>训练次数</span></div>
          <div><strong>—</strong><span>饮食记录</span></div>
        </div>
      </section>
    </template>
  </main>
</template>

<style scoped lang="scss">
.dashboard {
  min-height: calc(100vh - var(--bottom-nav-space));
  min-height: calc(100dvh - var(--bottom-nav-space));
  padding: 0 var(--spacing-md) var(--spacing-xl);
}

.dashboard-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 28px 0 20px;

  span {
    color: var(--color-text-secondary);
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.05em;
  }

  h1 {
    margin: 4px 0 2px;
    font-size: 1.5rem;
    font-weight: 850;
    letter-spacing: -0.04em;
  }

  p {
    margin: 0;
    color: var(--color-text-tertiary);
    font-size: 0.74rem;
  }

  &__avatar {
    display: grid;
    width: 44px;
    height: 44px;
    flex: none;
    place-items: center;
    color: var(--color-ink);
    font-weight: 850;
    background: var(--color-primary);
    border: 0;
    border-radius: 12px;
    box-shadow: 4px 4px 0 var(--color-ink);
  }
}

.performance-card {
  padding: 20px;
  color: #fff;
  background:
    radial-gradient(circle at 92% 6%, rgb(184 242 61 / 16%), transparent 29%), var(--color-ink);
  border-radius: var(--border-radius-lg);
  box-shadow: 0 18px 36px rgb(17 23 21 / 20%);

  &__header,
  &__summary,
  &__footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  &__header {
    > div {
      display: grid;
      gap: 3px;
    }

    span {
      color: var(--color-primary);
      font-size: 0.6rem;
      font-weight: 850;
      letter-spacing: 0.16em;
    }

    strong {
      font-size: 0.88rem;
    }

    :deep(.t-tag) {
      color: rgb(255 255 255 / 72%);
      border-color: rgb(255 255 255 / 18%);
    }
  }

  &__summary {
    align-items: flex-end;
    margin-top: 27px;

    > div:first-child > span {
      color: rgb(255 255 255 / 55%);
      font-size: 0.7rem;
    }
  }

  &__weight {
    margin-top: 2px;
    font-size: 3.25rem;
    font-weight: 850;
    line-height: 1;

    small {
      margin-left: 6px;
      color: rgb(255 255 255 / 56%);
      font-size: 0.8rem;
      letter-spacing: 0;
    }
  }

  &__empty {
    margin-top: 7px;
    font-size: 1.45rem;
    font-weight: 800;
  }

  &__footer {
    gap: 8px;
    padding: 14px 0 17px;
    border-top: 1px solid rgb(255 255 255 / 9%);

    > div {
      display: grid;
      min-width: 0;
      flex: 1;
      gap: 4px;
    }

    span {
      color: rgb(255 255 255 / 46%);
      font-size: 0.62rem;
    }

    strong {
      font-size: 0.82rem;
    }
  }

  &__action.t-button {
    color: var(--color-ink);
    background: var(--color-primary);
    border-color: var(--color-primary);
  }
}

.change-pill {
  display: grid;
  gap: 1px;
  color: var(--color-primary);
  font-size: 0.82rem;
  font-weight: 800;
  text-align: right;

  &.up {
    color: var(--color-accent);
  }

  small {
    color: rgb(255 255 255 / 42%);
    font-size: 0.6rem;
    font-weight: 500;
  }
}

.trend-chart {
  height: 80px;
  margin: 7px -4px 2px;

  svg {
    width: 100%;
    height: 100%;
    overflow: visible;
  }

  &__grid {
    stroke: rgb(255 255 255 / 10%);
    stroke-dasharray: 4 5;
  }

  &__line {
    fill: none;
    stroke: var(--color-primary);
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-width: 3;
    vector-effect: non-scaling-stroke;
  }
}

.dashboard-section {
  margin-top: 28px;
}

.section-title {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 12px;

  span {
    color: var(--color-text-tertiary);
    font-size: 0.6rem;
    font-weight: 850;
    letter-spacing: 0.16em;
  }

  h2 {
    margin: 3px 0 0;
    font-size: 1.05rem;
    font-weight: 850;
  }
}

.quick-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.quick-entry {
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: flex-start;
  padding: 11px 9px;
  text-align: left;
  background: #fff;
  border: 1px solid rgb(17 23 21 / 6%);
  border-radius: 12px;
  box-shadow: 0 7px 20px rgb(17 23 21 / 5%);

  &__icon {
    display: grid;
    width: 32px;
    height: 32px;
    margin-bottom: 13px;
    place-items: center;
    color: var(--color-ink);
    font-size: 1rem;
    background: var(--color-primary);
    border-radius: 9px;
  }

  strong {
    font-size: 0.75rem;
  }

  small {
    overflow: hidden;
    width: 100%;
    margin-top: 3px;
    color: var(--color-text-tertiary);
    font-size: 0.58rem;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &.disabled {
    opacity: 0.48;

    .quick-entry__icon {
      background: var(--color-surface-muted);
    }
  }
}

.weekly-card {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  background: var(--color-ink-soft);
  border-radius: 14px;
  padding: 17px 8px;

  div {
    display: grid;
    gap: 3px;
    text-align: center;

    + div {
      border-left: 1px solid rgb(255 255 255 / 10%);
    }
  }

  strong {
    color: #fff;
    font-size: 1.15rem;
  }

  span {
    color: rgb(255 255 255 / 45%);
    font-size: 0.62rem;
  }
}

@media (max-width: 390px) {
  .quick-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .quick-entry {
    min-height: 120px;
  }
}
</style>
