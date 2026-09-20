<script setup lang="ts">
import type { ApiErrorResponse, WorkoutRecord, WorkoutType } from '@fit-trace/shared';
import axios from 'axios';
import dayjs from 'dayjs';
import { Button, DialogPlugin, Loading, ToastPlugin } from 'tdesign-mobile-vue';
import { DeleteIcon } from 'tdesign-icons-vue-next';
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { deleteWorkout, getWorkout } from '@/api/workouts';
import RecordDetailHeader from '@/components/RecordDetailHeader.vue';

const workoutLabels: Record<WorkoutType, string> = {
  STRENGTH: '力量',
  CARDIO: '有氧',
  RUNNING: '跑步',
  CYCLING: '骑行',
  SWIMMING: '游泳',
  OTHER: '其他',
};

const route = useRoute();
const router = useRouter();
const workoutId = computed(() => (typeof route.params.id === 'string' ? route.params.id : ''));
const loading = ref(true);
const workout = ref<WorkoutRecord | null>(null);
const startedAtText = computed(() =>
  workout.value ? dayjs(workout.value.startedAt).format('YYYY年M月D日 HH:mm') : '',
);

function confirmDelete(): void {
  const target = workout.value;
  if (!target) return;
  let deleting = false;
  const dialog = DialogPlugin.confirm({
    title: '删除这条训练记录？',
    content: `${dayjs(target.startedAt).format('YYYY年M月D日')} · ${target.name}，删除后无法恢复。`,
    confirmBtn: { content: '删除', theme: 'danger' },
    cancelBtn: '取消',
    onConfirm: async () => {
      if (deleting) return;
      deleting = true;
      dialog.update({ confirmBtn: { content: '删除中…', theme: 'danger', loading: true } });
      try {
        await deleteWorkout(target.id);
        ToastPlugin.success('训练记录已删除');
        dialog.destroy();
        await router.replace('/workouts');
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
    workout.value = await getWorkout(workoutId.value);
  } catch {
    ToastPlugin.error('记录不存在或已被删除');
    await router.replace('/workouts');
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <main class="view-page detail-page">
    <RecordDetailHeader
      title="训练记录"
      :subtitle="startedAtText"
      action-label="编辑"
      @action="router.push(`/workouts/${workoutId}/edit`)"
    />

    <Loading class="page-loading" :loading="loading" text="正在读取记录">
      <template v-if="workout">
        <section class="surface-card workout-hero">
          <div class="workout-hero__top">
            <span class="workout-hero__type">{{ workoutLabels[workout.type] }}</span>
            <strong>{{ workout.name }}</strong>
          </div>
          <div class="workout-hero__duration">
            {{ workout.durationMinutes }} <small>分钟</small>
          </div>
          <span class="workout-hero__hint">
            {{ workout.calories === null ? '未记录消耗热量' : `消耗约 ${workout.calories} kcal` }}
          </span>
        </section>

        <section class="surface-card info-card">
          <div>
            <span>开始时间</span>
            <strong>{{ startedAtText }}</strong>
          </div>
          <div>
            <span>训练类型</span>
            <strong>{{ workoutLabels[workout.type] }}</strong>
          </div>
          <div>
            <span>消耗热量</span>
            <strong>{{ workout.calories === null ? '未记录' : `${workout.calories} kcal` }}</strong>
          </div>
          <div>
            <span>备注</span>
            <strong>{{ workout.note || '无' }}</strong>
          </div>
        </section>

        <div class="detail-actions">
          <Button variant="text" theme="danger" block @click="confirmDelete">
            <DeleteIcon /> 删除这条记录
          </Button>
        </div>
      </template>
    </Loading>
  </main>
</template>

<style scoped lang="scss">
.workout-hero {
  display: grid;
  gap: 7px;
  padding: 18px;

  &__top {
    display: flex;
    align-items: center;
    gap: 8px;

    strong {
      overflow: hidden;
      font-size: 0.86rem;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  &__type {
    flex: none;
    padding: 3px 8px;
    font-size: 0.66rem;
    font-weight: 750;
    background: var(--color-primary-light);
    border-radius: 6px;
  }

  &__duration {
    font-size: 2.4rem;
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.05em;

    small {
      font-size: 0.8rem;
      font-weight: 500;
    }
  }

  &__hint {
    color: var(--color-text-tertiary);
    font-size: 0.64rem;
  }
}

.info-card {
  display: grid;
  gap: 14px;
  margin-top: 12px;
  padding: 16px;

  > div {
    display: grid;
    gap: 5px;
  }

  span {
    color: var(--color-text-tertiary);
    font-size: 0.64rem;
  }

  strong {
    font-size: 0.82rem;
    font-weight: 600;
    line-height: 1.6;
  }
}

.detail-actions {
  margin-top: 18px;
}
</style>
