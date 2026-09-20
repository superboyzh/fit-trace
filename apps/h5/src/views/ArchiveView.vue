<script setup lang="ts">
import type {
  BodyRecord,
  MealRecord,
  MealType,
  PhotoType,
  ProgressPhoto,
  WorkoutRecord,
  WorkoutType,
} from '@fit-trace/shared';
import dayjs from 'dayjs';
import { Button, Empty, Loading } from 'tdesign-mobile-vue';
import { ActivityIcon, AddIcon, ForkIcon, MeasurementIcon } from 'tdesign-icons-vue-next';
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { getBodyRecords } from '@/api/body-records';
import { getMeals } from '@/api/meals';
import { getProgressPhotos } from '@/api/progress-photos';
import { getWorkouts } from '@/api/workouts';

type ArchiveFilter = 'ALL' | 'BODY' | 'MEAL' | 'WORKOUT' | 'PHOTO';
type ArchiveItem =
  | { id: string; kind: 'BODY'; recordedAt: string; body: BodyRecord }
  | { id: string; kind: 'MEAL'; recordedAt: string; meal: MealRecord }
  | { id: string; kind: 'WORKOUT'; recordedAt: string; workout: WorkoutRecord }
  | { id: string; kind: 'PHOTO'; recordedAt: string; photo: ProgressPhoto };

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
const photoLabels: Record<PhotoType, string> = {
  FRONT: '正面',
  SIDE: '侧面',
  BACK: '背面',
  OTHER: '其他',
};
const router = useRouter();
const loading = ref(true);
const activeFilter = ref<ArchiveFilter>('ALL');
const bodyRecords = ref<BodyRecord[]>([]);
const meals = ref<MealRecord[]>([]);
const workouts = ref<WorkoutRecord[]>([]);
const photos = ref<ProgressPhoto[]>([]);
const filters: Array<{ value: ArchiveFilter; label: string }> = [
  { value: 'ALL', label: '全部' },
  { value: 'BODY', label: '身体' },
  { value: 'MEAL', label: '饮食' },
  { value: 'WORKOUT', label: '训练' },
  { value: 'PHOTO', label: '照片' },
];
const items = computed<ArchiveItem[]>(() =>
  [
    ...bodyRecords.value.map((body) => ({
      id: `body-${body.id}`,
      kind: 'BODY' as const,
      recordedAt: body.recordedAt,
      body,
    })),
    ...meals.value.map((meal) => ({
      id: `meal-${meal.id}`,
      kind: 'MEAL' as const,
      recordedAt: meal.recordedAt,
      meal,
    })),
    ...workouts.value.map((workout) => ({
      id: `workout-${workout.id}`,
      kind: 'WORKOUT' as const,
      recordedAt: workout.startedAt,
      workout,
    })),
    ...photos.value.map((photo) => ({
      id: `photo-${photo.id}`,
      kind: 'PHOTO' as const,
      recordedAt: photo.recordedAt,
      photo,
    })),
  ]
    .filter((item) => activeFilter.value === 'ALL' || item.kind === activeFilter.value)
    .sort((a, b) => dayjs(b.recordedAt).valueOf() - dayjs(a.recordedAt).valueOf()),
);
const groups = computed(() => {
  const result = new Map<string, ArchiveItem[]>();
  for (const item of items.value) {
    const key = dayjs(item.recordedAt).format('YYYY-MM-DD');
    result.set(key, [...(result.get(key) ?? []), item]);
  }
  return [...result.entries()].map(([date, groupItems]) => ({ date, items: groupItems }));
});
function dateTitle(date: string): string {
  const value = dayjs(date);
  if (value.isSame(dayjs(), 'day')) return '今天';
  if (value.isSame(dayjs().subtract(1, 'day'), 'day')) return '昨天';
  return value.format('M月D日');
}
function openItem(item: ArchiveItem): void {
  if (item.kind === 'BODY') return void router.push(`/body/${item.body.id}/edit`);
  if (item.kind === 'MEAL') return void router.push(`/meals/${item.meal.id}`);
  if (item.kind === 'WORKOUT') return void router.push(`/workouts/${item.workout.id}`);
  router.push('/photos');
}
onMounted(async () => {
  try {
    const [bodyResult, mealResult, workoutResult, photoResult] = await Promise.all([
      getBodyRecords({ page: 1, pageSize: 100, recordedAtOrder: 'desc' }),
      getMeals({ page: 1, pageSize: 100 }),
      getWorkouts({ page: 1, pageSize: 100 }),
      getProgressPhotos({ page: 1, pageSize: 100 }),
    ]);
    bodyRecords.value = bodyResult.data;
    meals.value = mealResult.data;
    workouts.value = workoutResult.data;
    photos.value = photoResult.data;
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <main class="view-page archive-page">
    <header class="archive-header">
      <div>
        <h1>记录档案</h1>
        <p>身体与饮食，按真实记录时间排列。</p>
      </div>
      <Button size="small" @click="router.push('/record')"><AddIcon /> 记录</Button>
    </header>
    <div class="archive-filter">
      <button
        v-for="filter in filters"
        :key="filter.value"
        type="button"
        :class="{ active: activeFilter === filter.value }"
        @click="activeFilter = filter.value"
      >
        {{ filter.label }}
      </button>
      <span>{{ items.length }} 条记录</span>
    </div>

    <Loading class="page-loading" :loading="loading" text="正在整理记录">
      <Empty
        v-if="!loading && items.length === 0"
        title="这里还没有记录"
        description="完成一次身体或饮食记录后，会出现在这里。"
      />
      <div v-else class="archive-list">
        <section v-for="group in groups" :key="group.date" class="archive-group">
          <header>
            <strong>{{ dateTitle(group.date) }}</strong
            ><span>{{ dayjs(group.date).format('YYYY年M月D日') }}</span>
          </header>
          <div class="archive-group__body">
            <button
              v-for="item in group.items"
              :key="item.id"
              type="button"
              class="archive-row"
              @click="openItem(item)"
            >
              <span class="archive-row__time">{{ dayjs(item.recordedAt).format('HH:mm') }}</span>
              <span
                class="archive-row__icon"
                :class="{ 'archive-row__icon--photo': item.kind === 'PHOTO' }"
              >
                <img
                  v-if="item.kind === 'PHOTO'"
                  :src="item.photo.imageUrl"
                  :alt="`${photoLabels[item.photo.type]}照片`"
                  loading="lazy"
                />
                <MeasurementIcon v-else-if="item.kind === 'BODY'" />
                <ForkIcon v-else-if="item.kind === 'MEAL'" />
                <ActivityIcon v-else-if="item.kind === 'WORKOUT'" />
              </span>
              <span v-if="item.kind === 'BODY'" class="archive-row__content">
                <small>身体</small>
                <strong>{{ item.body.weight }} kg</strong>
                <span>
                  体脂 {{ item.body.bodyFat === null ? '—' : `${item.body.bodyFat}%` }} · 腰围
                  {{ item.body.waist === null ? '—' : `${item.body.waist} cm` }}
                </span>
              </span>
              <span v-else-if="item.kind === 'MEAL'" class="archive-row__content">
                <small>饮食 · {{ mealLabels[item.meal.type] }}</small>
                <strong>{{ item.meal.foods.map((food) => food.name).join('、') }}</strong>
                <span>
                  {{
                    item.meal.totalCalories === null
                      ? '未记录热量'
                      : `${item.meal.totalCalories} kcal`
                  }}
                </span>
              </span>
              <span v-else-if="item.kind === 'WORKOUT'" class="archive-row__content">
                <small>训练 · {{ workoutLabels[item.workout.type] }}</small>
                <strong>{{ item.workout.name }}</strong>
                <span>
                  {{ item.workout.durationMinutes }} 分钟<template
                    v-if="item.workout.calories !== null"
                  >
                    · {{ item.workout.calories }} kcal</template
                  >
                </span>
              </span>
              <span v-else class="archive-row__content">
                <small>照片 · {{ photoLabels[item.photo.type] }}</small>
                <strong>{{ item.photo.note || `${photoLabels[item.photo.type]}记录` }}</strong>
                <span>{{ dayjs(item.photo.recordedAt).format('YYYY年M月D日') }}</span>
              </span>
            </button>
          </div>
        </section>
      </div>
    </Loading>
  </main>
</template>

<style scoped lang="scss">
.archive-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  padding: 24px 0 18px;
  h1 {
    margin: 0 0 4px;
    font-size: 1.55rem;
    font-weight: 800;
  }
  p {
    margin: 0;
    color: var(--color-text-secondary);
    font-size: 0.76rem;
  }
  .t-button {
    color: var(--color-ink);
    background: var(--color-primary);
    border-color: var(--color-primary);
  }
}
.archive-filter {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 22px;
  button {
    padding: 8px 14px;
    color: var(--color-text-secondary);
    font-size: 0.7rem;
    font-weight: 700;
    background: transparent;
    border: 1px solid var(--color-border);
    border-radius: 8px;
    &.active {
      color: var(--color-ink);
      background: var(--color-primary-light);
      border-color: #d7e9ad;
    }
  }
  > span {
    overflow: hidden;
    flex: 1;
    color: var(--color-text-tertiary);
    font-size: 0.58rem;
    text-align: right;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
.archive-list {
  display: grid;
  gap: 24px;
}
.archive-group > header {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 9px;
  strong {
    font-size: 0.92rem;
  }
  span {
    color: var(--color-text-tertiary);
    font-size: 0.64rem;
  }
}
.archive-group__body {
  overflow: hidden;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius-md);
}
.archive-row {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 10px;
  padding: 14px;
  text-align: left;
  background: transparent;
  border: 0;
  + .archive-row {
    border-top: 1px solid var(--color-border);
  }
  &__time {
    width: 36px;
    flex: none;
    color: var(--color-text-tertiary);
    font-size: 0.65rem;
    font-variant-numeric: tabular-nums;
  }
  &__icon {
    display: grid;
    width: 34px;
    height: 34px;
    flex: none;
    place-items: center;
    color: var(--color-ink);
    background: var(--color-primary-light);
    border-radius: 9px;

    &--photo {
      overflow: hidden;
      background: var(--color-surface-muted);

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
    }
  }
  &__content {
    display: grid;
    min-width: 0;
    flex: 1;
    gap: 2px;
    small {
      color: var(--color-text-tertiary);
      font-size: 0.6rem;
    }
    strong,
    span {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    strong {
      font-size: 0.78rem;
    }
    span {
      color: var(--color-text-secondary);
      font-size: 0.64rem;
    }
  }
}
</style>
