<script setup lang="ts">
import type {
  BodyRecord,
  MealRecord,
  MealType,
  ProgressPhoto,
  WorkoutRecord,
  WorkoutType,
} from '@fit-trace/shared';
import dayjs from 'dayjs';
import { Button, Skeleton } from 'tdesign-mobile-vue';
import {
  ActivityIcon,
  CameraIcon,
  ChevronRightIcon,
  ForkIcon,
  MeasurementIcon,
} from 'tdesign-icons-vue-next';
import { computed, onActivated, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { getBodyRecords } from '@/api/body-records';
import { getMeals } from '@/api/meals';
import { getProgressPhotos } from '@/api/progress-photos';
import { getWorkouts } from '@/api/workouts';
import { useAuthStore } from '@/stores/auth';

const mealLabels: Record<MealType, string> = {
  BREAKFAST: '早餐',
  LUNCH: '午餐',
  DINNER: '晚餐',
  SNACK: '加餐',
};
const workoutLabels: Record<WorkoutType, string> = {
  STRENGTH: '力量',
  CARDIO: '有氧',
  RUNNING: '跑步',
  CYCLING: '骑行',
  SWIMMING: '游泳',
  OTHER: '其他',
};
const auth = useAuthStore();
const router = useRouter();
const loading = ref(true);
const bodyRecords = ref<BodyRecord[]>([]);
const meals = ref<MealRecord[]>([]);
const workouts = ref<WorkoutRecord[]>([]);
const photos = ref<ProgressPhoto[]>([]);
const displayName = computed(
  () => auth.user?.nickname || auth.user?.email?.split('@')[0] || '朋友',
);
const todayLabel = computed(() => {
  const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
  return `${dayjs().format('M月D日')} ${weekdays[dayjs().day()]}`;
});
const greeting = computed(() => {
  const hour = dayjs().hour();
  if (hour < 11) return '早上好';
  if (hour < 14) return '中午好';
  if (hour < 18) return '下午好';
  return '晚上好';
});
const latestBody = computed(() => bodyRecords.value[0] ?? null);
const previousBody = computed(() => bodyRecords.value[1] ?? null);
const weightChange = computed(() => {
  if (!latestBody.value || !previousBody.value) return null;
  return latestBody.value.weight - previousBody.value.weight;
});
const todayMeals = computed(() =>
  meals.value.filter((meal) => dayjs(meal.recordedAt).isSame(dayjs(), 'day')),
);
const todayCalories = computed(() => {
  const values = todayMeals.value.flatMap((meal) =>
    meal.totalCalories === null ? [] : [meal.totalCalories],
  );
  return values.length ? values.reduce((sum, value) => sum + value, 0) : null;
});
const latestMeal = computed(() => meals.value[0] ?? null);
const todayWorkouts = computed(() =>
  workouts.value.filter((workout) => dayjs(workout.startedAt).isSame(dayjs(), 'day')),
);
const todayWorkoutMinutes = computed(() =>
  todayWorkouts.value.reduce((sum, workout) => sum + workout.durationMinutes, 0),
);
const latestWorkout = computed(() => workouts.value[0] ?? null);
const latestPhoto = computed(() => photos.value[0] ?? null);

defineOptions({ name: 'DashboardView' });

async function loadOverview(silent = false): Promise<void> {
  if (!silent) loading.value = true;
  try {
    const [bodyResult, mealResult, workoutResult, photoResult] = await Promise.all([
      getBodyRecords({ page: 1, pageSize: 30, recordedAtOrder: 'desc' }),
      getMeals({ page: 1, pageSize: 30 }),
      getWorkouts({ page: 1, pageSize: 30 }),
      getProgressPhotos({ page: 1, pageSize: 30 }),
    ]);
    bodyRecords.value = bodyResult.data;
    meals.value = mealResult.data;
    workouts.value = workoutResult.data;
    photos.value = photoResult.data;
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
        <h1>{{ greeting }}，{{ displayName }}</h1>
      </div>
      <button class="avatar" type="button" @click="router.push('/profile')">
        {{ displayName.slice(0, 1).toUpperCase() }}
      </button>
    </header>

    <Skeleton v-if="loading" :loading="true" animation="gradient" :row-col="[1, 1, 1]" />
    <template v-else>
      <section class="content-section">
        <div class="section-heading">
          <div>
            <h2>今日概览</h2>
            <span>把重要的变化留在今天</span>
          </div>
          <Button variant="text" size="small" @click="router.push('/record')"
            >记录 <ChevronRightIcon
          /></Button>
        </div>
        <div class="overview-list">
          <button type="button" class="overview-row" @click="router.push('/body/create')">
            <span class="overview-row__icon"><MeasurementIcon /></span>
            <span class="overview-row__main"
              ><span>身体</span
              ><strong v-if="latestBody">{{ latestBody.weight }} <small>kg</small></strong
              ><strong v-else>尚未记录</strong></span
            >
            <span v-if="weightChange !== null" class="overview-row__meta"
              >较上次 {{ weightChange > 0 ? '+' : '' }}{{ weightChange.toFixed(1) }} kg</span
            >
            <span v-else class="overview-row__meta">记录体重</span><ChevronRightIcon />
          </button>
          <button type="button" class="overview-row" @click="router.push('/meals')">
            <span class="overview-row__icon"><ForkIcon /></span>
            <span class="overview-row__main"
              ><span>饮食</span><strong>{{ todayMeals.length }} <small>餐</small></strong></span
            >
            <span class="overview-row__meta">{{
              todayCalories === null ? '查看饮食日记' : `${todayCalories} kcal`
            }}</span
            ><ChevronRightIcon />
          </button>
          <button type="button" class="overview-row" @click="router.push('/workouts')">
            <span class="overview-row__icon"><ActivityIcon /></span>
            <span class="overview-row__main">
              <span>训练</span>
              <strong> {{ todayWorkouts.length }} <small>次</small> </strong>
            </span>
            <span class="overview-row__meta">
              {{ todayWorkoutMinutes > 0 ? `${todayWorkoutMinutes} 分钟` : '今天还没有训练记录' }}
            </span>
            <ChevronRightIcon />
          </button>
          <button type="button" class="overview-row" @click="router.push('/photos')">
            <span class="overview-row__icon"><CameraIcon /></span>
            <span class="overview-row__main">
              <span>照片</span>
              <strong>{{ photos.length }} <small>张</small></strong>
            </span>
            <span class="overview-row__meta">
              {{
                latestPhoto
                  ? `最近 ${dayjs(latestPhoto.recordedAt).format('M月D日')}`
                  : '上传第一张照片'
              }}
            </span>
            <ChevronRightIcon />
          </button>
        </div>
      </section>

      <section class="content-section">
        <div class="section-heading">
          <div>
            <h2>饮食日记</h2>
            <span>{{ todayMeals.length ? '今天已经记录的餐次' : '从今天第一餐开始记录' }}</span>
          </div>
          <Button variant="text" size="small" @click="router.push('/meals')">全部</Button>
        </div>
        <div v-if="todayMeals.length" class="meal-preview">
          <button
            v-for="meal in todayMeals.slice(0, 4)"
            :key="meal.id"
            type="button"
            @click="router.push(`/meals/${meal.id}`)"
          >
            <span class="meal-preview__time">{{ dayjs(meal.recordedAt).format('HH:mm') }}</span>
            <span class="meal-preview__content"
              ><strong>{{ mealLabels[meal.type] }}</strong
              ><span>{{ meal.foods.map((food) => food.name).join('、') }}</span></span
            >
            <span class="meal-preview__calories"
              >{{ meal.totalCalories === null ? '—' : meal.totalCalories }}<small>kcal</small></span
            >
          </button>
        </div>
        <button v-else class="empty-prompt" type="button" @click="router.push('/meals/create')">
          <span>还没有记录今天的饮食</span><strong>添加一餐 <ChevronRightIcon /></strong>
        </button>
      </section>

      <section class="content-section">
        <div class="section-heading">
          <div>
            <h2>最近记录</h2>
            <span>身体、饮食、训练与照片</span>
          </div>
          <Button variant="text" size="small" @click="router.push('/archive')">查看档案</Button>
        </div>
        <div class="latest-row">
          <div>
            <span>身体</span
            ><strong>{{ latestBody ? `${latestBody.weight} kg` : '暂无数据' }}</strong
            ><small>{{
              latestBody ? dayjs(latestBody.recordedAt).format('M月D日 HH:mm') : '—'
            }}</small>
          </div>
          <div>
            <span>饮食</span
            ><strong>{{ latestMeal ? mealLabels[latestMeal.type] : '暂无数据' }}</strong
            ><small>{{
              latestMeal ? dayjs(latestMeal.recordedAt).format('M月D日 HH:mm') : '—'
            }}</small>
          </div>
          <div>
            <span>训练</span
            ><strong>{{ latestWorkout ? workoutLabels[latestWorkout.type] : '暂无数据' }}</strong
            ><small>{{
              latestWorkout ? dayjs(latestWorkout.startedAt).format('M月D日 HH:mm') : '—'
            }}</small>
          </div>
          <div>
            <span>照片</span><strong>{{ latestPhoto ? '已记录' : '暂无数据' }}</strong
            ><small>{{ latestPhoto ? dayjs(latestPhoto.recordedAt).format('M月D日') : '—' }}</small>
          </div>
        </div>
      </section>
    </template>
  </main>
</template>

<style scoped lang="scss">
.dashboard {
  min-height: calc(100dvh - var(--bottom-nav-space));
  padding: 0 var(--spacing-md) 28px;
}
.dashboard-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 22px 0 20px;
  span {
    color: var(--color-text-secondary);
    font-size: 0.875rem;
  }
  h1 {
    margin: 4px 0 0;
    font-size: 1.45rem;
    font-weight: 800;
    letter-spacing: -0.035em;
  }
}
.avatar {
  display: grid;
  width: 40px;
  height: 40px;
  place-items: center;
  color: var(--color-text-primary);
  font-weight: 800;
  background: var(--color-primary-light);
  border: 1px solid var(--color-primary-border);
  border-radius: 50%;
}
.content-section {
  margin-bottom: 26px;
}
.section-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 11px;
  h2 {
    margin: 0 0 3px;
    font-size: 1rem;
    font-weight: 800;
  }
  span {
    color: var(--color-text-tertiary);
    font-size: 0.75rem;
  }
}
.overview-list,
.meal-preview,
.latest-row,
.empty-prompt {
  overflow: hidden;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius-md);
}
.overview-row {
  display: flex;
  width: 100%;
  min-height: 70px;
  align-items: center;
  gap: 11px;
  padding: 12px 14px;
  text-align: left;
  background: transparent;
  border: 0;
  + .overview-row {
    border-top: 1px solid var(--color-border);
  }
  &__icon {
    display: grid;
    width: 36px;
    height: 36px;
    flex: none;
    place-items: center;
    color: var(--color-text-primary);
    font-size: 1.05rem;
    background: var(--color-primary-light);
    border-radius: 9px;
  }
  &__main {
    display: grid;
    min-width: 76px;
    gap: 2px;
    > span {
      color: var(--color-text-tertiary);
      font-size: 0.75rem;
    }
    strong {
      font-size: 0.9375rem;
      small {
        font-size: 0.75rem;
      }
    }
  }
  &__meta {
    overflow: hidden;
    flex: 1;
    color: var(--color-text-secondary);
    font-size: 0.75rem;
    text-align: right;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  > svg {
    flex: none;
    color: var(--color-text-tertiary);
  }
  &--disabled {
    opacity: 0.55;
  }
}
.meal-preview {
  button {
    display: flex;
    width: 100%;
    align-items: center;
    gap: 12px;
    padding: 13px 14px;
    text-align: left;
    background: transparent;
    border: 0;
    + button {
      border-top: 1px solid var(--color-border);
    }
  }
  &__time {
    width: 38px;
    flex: none;
    color: var(--color-text-tertiary);
    font-size: 0.875rem;
    font-variant-numeric: tabular-nums;
  }
  &__content {
    display: grid;
    min-width: 0;
    flex: 1;
    gap: 3px;
    strong {
      font-size: 0.875rem;
    }
    span {
      overflow: hidden;
      color: var(--color-text-secondary);
      font-size: 0.75rem;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
  &__calories {
    display: grid;
    flex: none;
    font-size: 0.875rem;
    font-weight: 700;
    text-align: right;
    small {
      color: var(--color-text-tertiary);
      font-size: 0.75rem;
      font-weight: 500;
    }
  }
}
.empty-prompt {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  padding: 18px 15px;
  text-align: left;
  span {
    color: var(--color-text-secondary);
    font-size: 0.875rem;
  }
  strong {
    display: flex;
    align-items: center;
    gap: 3px;
    color: var(--color-text-primary);
    font-size: 0.875rem;
  }
}
.latest-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  > div {
    display: grid;
    gap: 4px;
    padding: 15px;

    &:nth-child(even) {
      border-left: 1px solid var(--color-border);
    }

    &:nth-child(n + 3) {
      border-top: 1px solid var(--color-border);
    }
  }
  span,
  small {
    color: var(--color-text-tertiary);
    font-size: 0.75rem;
  }
  strong {
    overflow: hidden;
    font-size: 0.9375rem;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
</style>
