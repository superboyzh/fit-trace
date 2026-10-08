<script setup lang="ts">
import type { DashboardOverview, MealType } from '@fit-trace/shared';
import dayjs from 'dayjs';
import { Button, Skeleton } from 'tdesign-mobile-vue';
import { ActivityIcon, ChevronRightIcon, ForkIcon, MeasurementIcon } from 'tdesign-icons-vue-next';
import { computed, onActivated, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { getDashboard } from '@/api/dashboard';
import { useAuthStore } from '@/stores/auth';

const mealLabels: Record<MealType, string> = {
  BREAKFAST: '早餐',
  LUNCH: '午餐',
  DINNER: '晚餐',
  SNACK: '加餐',
};
const auth = useAuthStore();
const router = useRouter();
const loading = ref(true);
const overview = ref<DashboardOverview | null>(null);
const errorMessage = ref('');
const displayName = computed(
  () => auth.user?.nickname || auth.user?.email?.split('@')[0] || '朋友',
);
const todayLabel = computed(() => {
  const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
  const date = dayjs(overview.value?.date);
  return `${date.format('M月D日')} ${weekdays[date.day()]}`;
});
const latestBody = computed(() => overview.value?.latestBodyRecord ?? null);
const todayBody = computed(() => overview.value?.today.bodyRecord ?? null);
const weightChange = computed(() => overview.value?.bodyChanges.weight ?? null);
const recentTrend = computed(() => overview.value?.recentTrend);
const recentWeightText = computed(() => {
  const change = recentTrend.value?.weightChange;
  if (change === null || change === undefined) return '—';
  if (change === 0) return '持平';
  return `${change > 0 ? '+' : '−'}${Number(Math.abs(change).toFixed(2))} kg`;
});
const todayMeals = computed(() => overview.value?.today.mealPreview ?? []);
const todayMealCount = computed(() => overview.value?.today.mealCount ?? 0);
const todayCalories = computed(() => overview.value?.today.calories ?? null);
const todayWorkoutCount = computed(() => overview.value?.today.workoutCount ?? 0);
const todayWorkoutMinutes = computed(() => overview.value?.today.workoutMinutes ?? 0);
const goalLabels = {
  LOSE_FAT: '减脂',
  GAIN_MUSCLE: '增肌',
  MAINTAIN: '保持',
} as const;
const goalRemaining = computed(() => {
  const goal = auth.user?.goal;
  const current = latestBody.value?.weight;
  if (!goal || current === undefined) return null;
  const difference = Math.abs(current - goal.targetWeight);
  if (difference < 0.05) return '已经达到目标体重';
  if (goal.type === 'MAINTAIN') return `与目标相差 ${difference.toFixed(1)} kg`;
  return `距离目标还差 ${difference.toFixed(1)} kg`;
});
const goalDateText = computed(() => {
  const targetDate = auth.user?.goal?.targetDate;
  if (!targetDate) return '按自己的节奏推进';
  const days = dayjs(targetDate).startOf('day').diff(dayjs().startOf('day'), 'day');
  if (days < 0) return '目标日期已到，可重新调整';
  if (days === 0) return '目标日期是今天';
  return `还有 ${days} 天`;
});
function addRecord(path: string): void {
  void router.push({ path, query: { returnTo: '/dashboard' } });
}

defineOptions({ name: 'DashboardView' });

async function loadOverview(silent = false): Promise<void> {
  if (!silent) loading.value = true;
  errorMessage.value = '';
  try {
    overview.value = await getDashboard();
  } catch {
    errorMessage.value = overview.value
      ? '刷新失败，当前展示的是上次加载的数据'
      : '首页加载失败，请稍后重试';
  } finally {
    if (!silent) loading.value = false;
  }
}

onMounted(() => void loadOverview());
// 从别的 tab 切回来时静默刷新：保留原内容，不再闪加载态
let activated = false;
onActivated(() => {
  if (!activated) {
    activated = true;
    return;
  }
  void loadOverview(true);
});
</script>

<template>
  <main class="dashboard">
    <header class="dashboard-header">
      <div>
        <span>{{ todayLabel }}</span>
        <h1>今天</h1>
      </div>
      <button class="avatar" type="button" aria-label="我的资料" @click="router.push('/profile')">
        {{ displayName.slice(0, 1).toUpperCase() }}
      </button>
    </header>
    <nav class="quick-actions" aria-label="快速记录">
      <button type="button" @click="addRecord('/body/create')">
        <MeasurementIcon /><span>记体重</span>
      </button>
      <button type="button" @click="addRecord('/meals/create')">
        <ForkIcon /><span>记饮食</span>
      </button>
      <button type="button" @click="addRecord('/workouts/create')">
        <ActivityIcon /><span>记训练</span>
      </button>
    </nav>
    <Skeleton v-if="loading" :loading="true" animation="gradient" :row-col="[1, 1, 1]" />
    <section v-if="errorMessage" class="load-error" role="alert">
      <span>{{ errorMessage }}</span
      ><Button variant="text" size="small" :disabled="loading" @click="loadOverview(!!overview)"
        >重试</Button
      >
    </section>
    <template v-if="!loading && overview">
      <section class="content-section">
        <div class="section-heading">
          <h2>身体</h2>
          <button type="button" @click="router.push('/body/history')">
            历史 <ChevronRightIcon />
          </button>
        </div>
        <button
          class="body-summary"
          type="button"
          @click="todayBody ? router.push(`/body/${todayBody.id}`) : addRecord('/body/create')"
        >
          <div>
            <span>{{ todayBody ? '今日体重' : latestBody ? '上次体重' : '今日体重' }}</span
            ><strong>{{ (todayBody ?? latestBody)?.weight ?? '—' }} <small>kg</small></strong>
          </div>
          <div class="body-summary__aside">
            <span v-if="todayBody && weightChange !== null"
              >较上次 {{ weightChange > 0 ? '+' : '' }}{{ weightChange.toFixed(1) }} kg</span
            ><span v-else>{{
              latestBody ? dayjs(latestBody.recordedAt).format('M月D日') : '从第一条记录开始'
            }}</span
            ><span>{{ todayBody ? '查看记录' : '记录今天的体重' }} <ChevronRightIcon /></span>
          </div>
        </button>
        <button class="goal-row" type="button" @click="router.push('/goal')">
          <span v-if="auth.user?.goal"
            ><strong
              >{{ goalLabels[auth.user.goal.type] }} · {{ auth.user.goal.targetWeight }} kg</strong
            ><small>{{ goalRemaining || '记录体重后查看进度' }} · {{ goalDateText }}</small></span
          >
          <span v-else>设置体重目标 <small>按自己的节奏记录</small></span
          ><ChevronRightIcon />
        </button>
      </section>
      <section class="content-section">
        <div class="section-heading">
          <h2>
            饮食
            <small
              >{{ todayMealCount }} 餐<span v-if="todayCalories !== null">
                · {{ todayCalories }} kcal</span
              ></small
            >
          </h2>
          <button type="button" @click="router.push('/meals')">日记 <ChevronRightIcon /></button>
        </div>
        <div class="diary-list">
          <button
            v-for="meal in todayMeals"
            :key="meal.id"
            type="button"
            class="diary-row"
            @click="router.push(`/meals/${meal.id}`)"
          >
            <span class="diary-row__time">{{ dayjs(meal.recordedAt).format('HH:mm') }}</span
            ><span class="diary-row__main"
              ><strong>{{ mealLabels[meal.type] }}</strong
              ><span>{{ meal.foodNames.join('、') }}</span></span
            ><span class="diary-row__value"
              >{{ meal.totalCalories ?? '—' }}<small>kcal</small></span
            >
          </button>
          <button
            v-if="!todayMealCount"
            type="button"
            class="empty-row"
            @click="addRecord('/meals/create')"
          >
            <span>今天还没有饮食记录</span><strong>添加一餐</strong>
          </button>
          <button
            v-if="todayMealCount > todayMeals.length"
            type="button"
            class="more-row"
            @click="router.push('/meals')"
          >
            查看全部 {{ todayMealCount }} 餐 <ChevronRightIcon />
          </button>
        </div>
      </section>
      <section class="content-section">
        <div class="section-heading">
          <h2>训练</h2>
          <button type="button" @click="router.push('/workouts')">历史 <ChevronRightIcon /></button>
        </div>
        <button
          class="empty-row"
          type="button"
          @click="todayWorkoutCount ? router.push('/workouts') : addRecord('/workouts/create')"
        >
          <span>{{
            todayWorkoutCount
              ? `今天 ${todayWorkoutCount} 次 · ${todayWorkoutMinutes} 分钟`
              : '今天还没有训练记录'
          }}</span
          ><strong>{{ todayWorkoutCount ? '查看训练' : '记录训练' }}</strong>
        </button>
      </section>
      <section v-if="recentTrend" class="content-section">
        <div class="section-heading">
          <h2>近 7 天</h2>
          <button type="button" @click="router.push('/trends')">
            查看趋势 <ChevronRightIcon />
          </button>
        </div>
        <div class="trend-summary">
          <div>
            <span>体重变化</span><strong>{{ recentWeightText }}</strong>
          </div>
          <div>
            <span>饮食记录</span
            ><strong>{{ recentTrend.mealRecordedDays }} <small>天</small></strong>
          </div>
          <div>
            <span>训练时长</span
            ><strong>{{ recentTrend.workoutMinutes }} <small>分钟</small></strong>
          </div>
          <p>
            {{ dayjs(recentTrend.from).format('M/D') }}–{{ dayjs(recentTrend.to).format('M/D') }} ·
            {{
              recentTrend.bodyRecordedDays < 2
                ? '至少记录两天体重后可查看变化'
                : `体重按每天最后一次记录计算 · 已记录 ${recentTrend.bodyRecordedDays} 天`
            }}
          </p>
        </div>
      </section>
      <nav class="secondary-links" aria-label="更多记录">
        <button type="button" @click="router.push('/photos')">身材照片 <ChevronRightIcon /></button
        ><button type="button" @click="router.push('/archive')">
          全部档案 <ChevronRightIcon />
        </button>
      </nav>
    </template>
  </main>
</template>

<style scoped lang="scss">
.dashboard {
  padding: 0 20px 24px;
}
.dashboard-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 0 20px;
  span {
    color: var(--color-text-secondary);
    font-size: 0.8125rem;
  }
  h1 {
    margin: 4px 0 0;
    font-size: 1.75rem;
    font-weight: 650;
  }
}
.avatar {
  width: 38px;
  height: 38px;
  border: 0;
  border-radius: 50%;
  background: var(--color-surface-muted);
  color: var(--color-text-secondary);
}
.quick-actions {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  background: var(--color-surface);
  border-radius: 14px;
  margin-bottom: 28px;
  button {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    padding: 19px 4px;
    border: 0;
    background: transparent;
    color: var(--color-text-primary);
    font-size: 0.875rem;
  }
  svg {
    font-size: 1.15rem;
    color: var(--color-accent-text);
  }
}
.content-section {
  margin-bottom: 26px;
}
.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  h2 {
    margin: 0;
    font-size: 1rem;
    font-weight: 650;
  }
  small {
    margin-left: 6px;
    font-size: 0.75rem;
    color: var(--color-text-secondary);
    font-weight: 400;
  }
  button {
    display: flex;
    align-items: center;
    gap: 2px;
    min-height: 36px;
    border: 0;
    background: transparent;
    font-size: 0.8125rem;
    color: var(--color-text-secondary);
  }
}
.body-summary {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 18px 16px;
  text-align: left;
  border: 0;
  border-radius: 12px 12px 0 0;
  background: var(--color-surface);
  color: var(--color-text-primary);
  > div {
    display: grid;
    gap: 8px;
  }
  span {
    color: var(--color-text-secondary);
    font-size: 0.8125rem;
  }
  strong {
    font-size: 2rem;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }
  small {
    font-size: 0.875rem;
    font-weight: 400;
  }
  &__aside {
    text-align: right;
    span:last-child {
      display: flex;
      align-items: center;
      justify-content: flex-end;
    }
  }
}
.goal-row {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 12px 16px;
  border: 0;
  border-top: 1px solid var(--color-border);
  border-radius: 0 0 12px 12px;
  background: var(--color-surface);
  text-align: left;
  color: var(--color-text-secondary);
  font-size: 0.8125rem;
  > span {
    display: grid;
    gap: 4px;
  }
  strong {
    font-weight: 500;
  }
  small {
    font-size: 0.75rem;
    line-height: 1.5;
  }
  svg {
    flex: none;
  }
}
.diary-list {
  overflow: hidden;
  border-radius: 12px;
  background: var(--color-surface);
}
.diary-row {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 12px;
  padding: 15px 14px;
  border: 0;
  background: transparent;
  color: var(--color-text-primary);
  text-align: left;
  + .diary-row {
    border-top: 1px solid var(--color-border);
  }
  &__time {
    color: var(--color-text-secondary);
    font-size: 0.75rem;
  }
  &__main {
    display: grid;
    min-width: 0;
    flex: 1;
    gap: 5px;
    strong {
      font-size: 0.875rem;
      font-weight: 550;
    }
    > span {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 0.8125rem;
      color: var(--color-text-secondary);
    }
  }
  &__value {
    display: grid;
    text-align: right;
    font-size: 0.875rem;
    small {
      color: var(--color-text-secondary);
      font-size: 0.6875rem;
    }
  }
}
.empty-row,
.more-row {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-height: 64px;
  padding: 15px;
  border: 0;
  border-radius: 12px;
  background: var(--color-surface);
  color: var(--color-text-secondary);
  text-align: left;
  font-size: 0.8125rem;
  strong {
    color: var(--color-accent-text);
    font-weight: 500;
    white-space: nowrap;
  }
}
.more-row {
  min-height: 44px;
  border-top: 1px solid var(--color-border);
  border-radius: 0;
}
.trend-summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px 8px;
  padding: 16px 12px;
  border-radius: 12px;
  background: var(--color-surface);
  > div {
    display: grid;
    gap: 8px;
  }
  span,
  small,
  p {
    font-size: 0.75rem;
    color: var(--color-text-secondary);
  }
  strong {
    font-size: 1rem;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }
  small {
    font-weight: 400;
  }
  p {
    grid-column: 1 / -1;
    margin: 0;
    line-height: 1.6;
  }
}
.secondary-links {
  display: flex;
  gap: 20px;
  button {
    display: flex;
    flex: 1;
    align-items: center;
    justify-content: space-between;
    min-height: 44px;
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--color-text-secondary);
    font-size: 0.8125rem;
  }
}
.load-error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 16px;
  color: var(--color-text-secondary);
  font-size: 0.8125rem;
}
</style>
