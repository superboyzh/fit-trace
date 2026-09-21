<script setup lang="ts">
import type { ApiErrorResponse, WorkoutRecord, WorkoutType } from '@fit-trace/shared';
import axios from 'axios';
import dayjs from 'dayjs';
import { Button, DialogPlugin, Empty, Loading, ToastPlugin } from 'tdesign-mobile-vue';
import { AddIcon, DeleteIcon, EditIcon } from 'tdesign-icons-vue-next';
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { deleteWorkout, getWorkouts } from '@/api/workouts';
import SportIcon from '@/components/SportIcon.vue';
import RecordDetailHeader from '@/components/RecordDetailHeader.vue';

const workoutTypes: Array<{ value: WorkoutType; label: string }> = [
  { value: 'STRENGTH', label: '力量' },
  { value: 'CARDIO', label: '有氧' },
  { value: 'RUNNING', label: '跑步' },
  { value: 'CYCLING', label: '骑行' },
  { value: 'SWIMMING', label: '游泳' },
  { value: 'OTHER', label: '其他' },
];
const workoutMeta = Object.fromEntries(workoutTypes.map((item) => [item.value, item])) as Record<
  WorkoutType,
  { value: WorkoutType; label: string }
>;
const filters: Array<{ value: WorkoutType | 'ALL'; label: string }> = [
  { value: 'ALL', label: '全部' },
  ...workoutTypes.map((item) => ({ value: item.value, label: item.label })),
];

const router = useRouter();
const workouts = ref<WorkoutRecord[]>([]);
const loading = ref(true);
const loadingMore = ref(false);
const page = ref(1);
const total = ref(0);
const activeType = ref<WorkoutType | 'ALL'>('ALL');
const pageSize = 20;

async function load(reset = false): Promise<void> {
  if (reset) {
    page.value = 1;
    workouts.value = [];
  }
  const result = await getWorkouts({
    page: page.value,
    pageSize,
    ...(activeType.value === 'ALL' ? {} : { type: activeType.value }),
  });
  workouts.value.push(...result.data);
  total.value = result.meta.total;
}

async function selectType(type: WorkoutType | 'ALL'): Promise<void> {
  if (type === activeType.value) return;
  activeType.value = type;
  loading.value = true;
  try {
    await load(true);
  } catch {
    ToastPlugin.error('训练记录加载失败');
  } finally {
    loading.value = false;
  }
}

async function loadMore(): Promise<void> {
  loadingMore.value = true;
  page.value += 1;
  try {
    await load();
  } catch {
    page.value -= 1;
    ToastPlugin.error('加载更多记录失败');
  } finally {
    loadingMore.value = false;
  }
}

function dateLabel(value: string): string {
  const date = dayjs(value);
  if (date.isSame(dayjs(), 'day')) return `今天 ${date.format('HH:mm')}`;
  if (date.isSame(dayjs().subtract(1, 'day'), 'day')) return `昨天 ${date.format('HH:mm')}`;
  return date.format('M月D日 HH:mm');
}

function confirmDelete(workout: WorkoutRecord): void {
  let deleting = false;
  const dialog = DialogPlugin.confirm({
    title: '删除这条训练记录？',
    content: `${dayjs(workout.startedAt).format('YYYY年M月D日')} · ${workout.name}，删除后无法恢复。`,
    confirmBtn: { content: '删除', theme: 'danger' },
    cancelBtn: '取消',
    onConfirm: async () => {
      if (deleting) return;
      deleting = true;
      dialog.update({ confirmBtn: { content: '删除中…', theme: 'danger', loading: true } });
      try {
        await deleteWorkout(workout.id);
        workouts.value = workouts.value.filter((item) => item.id !== workout.id);
        total.value -= 1;
        ToastPlugin.success('训练记录已删除');
        dialog.destroy();
      } catch (error) {
        const message = axios.isAxiosError<ApiErrorResponse>(error)
          ? error.response?.data.message
          : undefined;
        ToastPlugin.error(message ?? '删除失败，请稍后重试');
        deleting = false;
        dialog.update({ confirmBtn: { content: '删除', theme: 'danger' } });
      }
    },
  });
}

onMounted(async () => {
  try {
    await load();
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <main class="view-page workouts-page">
    <RecordDetailHeader
      title="训练记录"
      subtitle="把练过的留下，和身体变化放在同一条时间线上。"
      action-label="新记录"
      @action="router.push('/workouts/create')"
    />

    <div class="workout-filter" aria-label="按训练类型筛选">
      <button
        v-for="filter in filters"
        :key="filter.value"
        type="button"
        :class="{ active: activeType === filter.value }"
        @click="selectType(filter.value)"
      >
        {{ filter.label }}
      </button>
    </div>

    <Loading class="page-loading" :loading="loading" text="正在读取训练记录">
      <Empty
        v-if="!loading && workouts.length === 0"
        title="还没有训练记录"
        description="完成一次训练后，在这里留下第一条记录。"
      >
        <template #action>
          <Button theme="primary" @click="router.push('/workouts/create')">记录第一次训练</Button>
        </template>
      </Empty>

      <div v-else class="workout-list">
        <section
          v-for="workout in workouts"
          :key="workout.id"
          class="surface-card workout-card"
          role="button"
          tabindex="0"
          @click="router.push(`/workouts/${workout.id}`)"
          @keydown.enter="router.push(`/workouts/${workout.id}`)"
        >
          <div class="workout-card__heading">
            <span class="workout-card__icon"><SportIcon :type="workout.type" /></span>
            <div class="workout-card__title">
              <strong>{{ workout.name }}</strong>
              <span
                >{{ workoutMeta[workout.type].label }} · {{ dateLabel(workout.startedAt) }}</span
              >
            </div>
            <span class="workout-card__duration"
              >{{ workout.durationMinutes }}<small>分钟</small></span
            >
          </div>

          <div v-if="workout.calories !== null" class="workout-card__metrics">
            <div>
              <span>消耗热量</span><strong>{{ workout.calories }} kcal</strong>
            </div>
          </div>

          <p v-if="workout.note" class="workout-card__note">{{ workout.note }}</p>

          <div class="workout-card__actions">
            <Button
              size="small"
              variant="text"
              @click.stop="
                router.push({ path: '/workouts/create', query: { copyFrom: workout.id } })
              "
            >
              <AddIcon /> 再练一次
            </Button>
            <Button
              size="small"
              variant="text"
              @click.stop="router.push(`/workouts/${workout.id}/edit`)"
            >
              <EditIcon /> 编辑
            </Button>
            <Button size="small" variant="text" theme="danger" @click.stop="confirmDelete(workout)">
              <DeleteIcon /> 删除
            </Button>
          </div>
        </section>
      </div>

      <Button
        v-if="workouts.length < total"
        class="load-more"
        variant="outline"
        block
        :loading="loadingMore"
        @click="loadMore"
      >
        加载更多
      </Button>
    </Loading>
  </main>
</template>

<style scoped lang="scss">
.workouts-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  padding: 24px 0 18px;

  h1 {
    margin: 0 0 4px;
    font-size: 1.55rem;
    font-weight: 800;
    letter-spacing: -0.04em;
  }

  p {
    margin: 0;
    color: var(--color-text-secondary);
    font-size: 0.875rem;
    line-height: 1.6;
  }
}

.workout-filter {
  display: flex;
  gap: 6px;
  margin-bottom: 16px;
  overflow-x: auto;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }

  button {
    min-width: 54px;
    flex: 1 0 auto;
    padding: 8px 12px;
    color: var(--color-text-secondary);
    font-size: 0.75rem;
    font-weight: 700;
    background: transparent;
    border: 1px solid var(--color-border);
    border-radius: 8px;

    &.active {
      color: var(--color-text-primary);
      background: var(--color-primary-light);
      border-color: var(--color-primary-border);
    }
  }
}

.workout-list {
  display: grid;
  gap: 10px;
}

.workout-card {
  padding: 15px;
  cursor: pointer;
  transition:
    background-color var(--duration-fast) var(--ease-standard),
    transform var(--duration-fast) var(--ease-standard);

  &:active {
    background: var(--color-surface-muted);
    transform: scale(0.995);
  }

  &__heading {
    display: flex;
    align-items: center;
    gap: 11px;
  }

  &__icon {
    display: grid;
    width: 38px;
    height: 38px;
    flex: none;
    place-items: center;
    color: var(--color-text-primary);
    font-size: 1.15rem;
    background: var(--color-primary-light);
    border-radius: 10px;
  }

  &__title {
    display: grid;
    min-width: 0;
    flex: 1;
    gap: 3px;

    strong {
      overflow: hidden;
      font-size: 0.9375rem;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    span {
      color: var(--color-text-tertiary);
      font-size: 0.75rem;
    }
  }

  &__duration {
    flex: none;
    font-size: 1.05rem;
    font-weight: 800;
    font-variant-numeric: tabular-nums;

    small {
      margin-left: 2px;
      color: var(--color-text-tertiary);
      font-size: 0.75rem;
      font-weight: 500;
    }
  }

  &__metrics {
    display: grid;
    gap: 6px;
    margin-top: 13px;
    padding: 11px 12px;
    background: var(--color-surface-muted);
    border-radius: 10px;

    div {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 10px;
    }

    span {
      color: var(--color-text-tertiary);
      font-size: 0.75rem;
    }

    strong {
      font-size: 0.875rem;
    }
  }

  &__note {
    margin: 11px 0 0;
    color: var(--color-text-secondary);
    font-size: 0.875rem;
    line-height: 1.55;
  }

  &__actions {
    display: flex;
    justify-content: flex-end;
    gap: 4px;
    margin: 8px -7px -7px 0;
  }
}

.load-more {
  margin-top: var(--spacing-md);
}
</style>
