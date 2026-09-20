<script setup lang="ts">
import type { ApiErrorResponse, WorkoutType } from '@fit-trace/shared';
import axios from 'axios';
import dayjs from 'dayjs';
import {
  Button,
  DateTimePicker,
  Input,
  Loading,
  Popup,
  Textarea,
  ToastPlugin,
} from 'tdesign-mobile-vue';
import { CalendarIcon, ChevronLeftIcon } from 'tdesign-icons-vue-next';
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { createWorkout, getWorkout, updateWorkout, type WorkoutInput } from '@/api/workouts';

const workoutTypes: Array<{ value: WorkoutType; label: string; icon: string }> = [
  { value: 'STRENGTH', label: '力量', icon: '🏋️' },
  { value: 'CARDIO', label: '有氧', icon: '🫀' },
  { value: 'RUNNING', label: '跑步', icon: '🏃' },
  { value: 'CYCLING', label: '骑行', icon: '🚴' },
  { value: 'SWIMMING', label: '游泳', icon: '🏊' },
  { value: 'OTHER', label: '其他', icon: '🎯' },
];
const durationPresets = [20, 30, 45, 60, 90];

const route = useRoute();
const router = useRouter();
const workoutId = computed(() => (typeof route.params.id === 'string' ? route.params.id : null));
const isEdit = computed(() => Boolean(workoutId.value));
const loading = ref(Boolean(workoutId.value));
const submitting = ref(false);
const datePickerVisible = ref(false);
const formData = reactive({
  type: 'STRENGTH' as WorkoutType,
  name: '',
  startedAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
  durationMinutes: '' as number | string,
  calories: '' as number | string,
  note: '',
});
const startedAtDisplay = computed(() => dayjs(formData.startedAt).format('YYYY-MM-DD HH:mm'));
const selectedType = computed(
  () => workoutTypes.find((item) => item.value === formData.type) ?? workoutTypes[0],
);

function confirmStartedAt(value: string | number): void {
  formData.startedAt = dayjs(value).format('YYYY-MM-DD HH:mm:ss');
  datePickerVisible.value = false;
}

function optionalNumber(value: number | string): number | undefined {
  if (value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

async function submit(): Promise<void> {
  if (submitting.value) return;
  if (!formData.name.trim()) {
    ToastPlugin.warning('请输入训练名称');
    return;
  }
  const duration = optionalNumber(formData.durationMinutes);
  if (duration === undefined || duration <= 0) {
    ToastPlugin.warning('请填写训练时长');
    return;
  }

  const input: WorkoutInput = {
    type: formData.type,
    name: formData.name.trim(),
    startedAt: dayjs(formData.startedAt).toISOString(),
    durationMinutes: Math.round(duration),
    calories: optionalNumber(formData.calories),
    note: formData.note.trim() || undefined,
  };

  submitting.value = true;
  try {
    if (workoutId.value) {
      await updateWorkout(workoutId.value, input);
      ToastPlugin.success('训练记录已更新');
    } else {
      await createWorkout(input);
      ToastPlugin.success('训练记录已保存');
    }
    await router.replace('/workouts');
  } catch (error) {
    const message = axios.isAxiosError<ApiErrorResponse>(error)
      ? error.response?.data.message
      : undefined;
    ToastPlugin.error(message ?? '保存失败，请稍后重试');
  } finally {
    submitting.value = false;
  }
}

onMounted(async () => {
  if (!workoutId.value) return;
  try {
    const workout = await getWorkout(workoutId.value);
    formData.type = workout.type;
    formData.name = workout.name;
    formData.startedAt = dayjs(workout.startedAt).format('YYYY-MM-DD HH:mm:ss');
    formData.durationMinutes = workout.durationMinutes;
    formData.calories = workout.calories ?? '';
    formData.note = workout.note ?? '';
  } catch {
    await router.replace('/workouts');
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <main class="view-page workout-form-page">
    <header class="workout-form-header">
      <Button variant="text" shape="round" @click="router.back()">
        <ChevronLeftIcon /> 返回
      </Button>
      <h1>{{ isEdit ? '编辑训练记录' : '记录一次训练' }}</h1>
      <p>先记下练了什么、练了多久，细节可以之后补充。</p>
    </header>

    <Loading class="page-loading" :loading="loading" text="正在读取训练记录">
      <section class="surface-card workout-form-card">
        <div class="field-block">
          <span class="field-label">训练类型</span>
          <div class="workout-type-grid">
            <button
              v-for="item in workoutTypes"
              :key="item.value"
              type="button"
              :class="{ active: formData.type === item.value }"
              @click="formData.type = item.value"
            >
              <span class="workout-type-grid__icon">{{ item.icon }}</span>
              <strong>{{ item.label }}</strong>
            </button>
          </div>
        </div>

        <div class="field-block">
          <span class="field-label">训练名称</span>
          <Input
            v-model="formData.name"
            :maxlength="60"
            :placeholder="`例如：${selectedType.label}训练`"
          />
        </div>

        <div class="field-block">
          <span class="field-label">开始时间</span>
          <Input :model-value="startedAtDisplay" readonly @click="datePickerVisible = true">
            <template #suffix-icon><CalendarIcon /></template>
          </Input>
        </div>

        <div class="field-block">
          <span class="field-label">训练时长</span>
          <Input
            v-model="formData.durationMinutes"
            type="number"
            inputmode="numeric"
            suffix="分钟"
            placeholder="45"
          />
          <div class="preset-row">
            <button
              v-for="preset in durationPresets"
              :key="preset"
              type="button"
              :class="{ active: Number(formData.durationMinutes) === preset }"
              @click="formData.durationMinutes = preset"
            >
              {{ preset }} 分钟
            </button>
          </div>
        </div>

        <div class="field-block">
          <span class="field-label">消耗热量（可选）</span>
          <Input v-model="formData.calories" type="number" suffix="kcal" placeholder="例如 320" />
        </div>

        <div class="field-block note-field">
          <span class="field-label">备注</span>
          <Textarea
            v-model="formData.note"
            :maxlength="500"
            :autosize="{ minRows: 3, maxRows: 6 }"
            placeholder="例如：状态不错、组间休息偏长等"
          />
        </div>

        <Button theme="primary" size="large" block :loading="submitting" @click="submit">
          {{ isEdit ? '保存修改' : '保存训练记录' }}
        </Button>
      </section>
    </Loading>

    <Popup v-model="datePickerVisible" placement="bottom">
      <DateTimePicker
        :value="formData.startedAt"
        title="选择开始时间"
        :mode="['date', 'minute']"
        format="YYYY-MM-DD HH:mm:ss"
        @confirm="confirmStartedAt"
        @cancel="datePickerVisible = false"
      />
    </Popup>
  </main>
</template>

<style scoped lang="scss">
.workout-form-header {
  padding: 18px 0 20px;

  > .t-button {
    margin: 0 0 13px -10px;
  }

  h1 {
    margin: 6px 0 5px;
    font-size: 1.7rem;
    letter-spacing: -0.04em;
  }

  p {
    margin: 0;
    color: var(--color-text-secondary);
    font-size: 0.8rem;
  }
}

.workout-form-card {
  width: 100%;
  padding: 18px;
}

.field-block {
  display: grid;
  gap: 9px;
  margin-bottom: 20px;
}

.field-label {
  color: var(--color-text-secondary);
  font-size: 0.72rem;
  font-weight: 750;
}

.workout-type-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 7px;

  button {
    display: grid;
    place-items: center;
    gap: 5px;
    padding: 12px 6px;
    color: var(--color-text-secondary);
    background: var(--color-surface-muted);
    border: 1px solid transparent;
    border-radius: 10px;

    strong {
      font-size: 0.72rem;
    }

    &.active {
      color: var(--color-ink);
      background: var(--color-primary-light);
      border-color: var(--color-primary);
    }
  }

  &__icon {
    font-size: 1.15rem;
    line-height: 1;
  }
}

.preset-row {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }

  button {
    flex: 1 0 auto;
    padding: 7px 12px;
    color: var(--color-text-secondary);
    font-size: 0.66rem;
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
}

.note-field {
  margin-bottom: 22px;
}

@media (max-width: 360px) {
  .workout-type-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
