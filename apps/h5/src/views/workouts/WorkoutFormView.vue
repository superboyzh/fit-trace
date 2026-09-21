<script setup lang="ts">
import type { ApiErrorResponse, WorkoutRecord, WorkoutType } from '@fit-trace/shared';
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
import {
  createWorkout,
  getWorkout,
  getWorkouts,
  updateWorkout,
  type WorkoutInput,
} from '@/api/workouts';
import SportIcon from '@/components/SportIcon.vue';

const workoutTypes: Array<{ value: WorkoutType; label: string }> = [
  { value: 'STRENGTH', label: '力量' },
  { value: 'CARDIO', label: '有氧' },
  { value: 'RUNNING', label: '跑步' },
  { value: 'CYCLING', label: '骑行' },
  { value: 'SWIMMING', label: '游泳' },
  { value: 'OTHER', label: '其他' },
];
const durationPresets = [20, 30, 45, 60, 90];

const route = useRoute();
const router = useRouter();
const workoutId = computed(() => (typeof route.params.id === 'string' ? route.params.id : null));
const copyFromId = computed(() =>
  typeof route.query.copyFrom === 'string' ? route.query.copyFrom : null,
);
const isEdit = computed(() => Boolean(workoutId.value));
const loading = ref(Boolean(workoutId.value || copyFromId.value));
const submitting = ref(false);
const datePickerVisible = ref(false);
const recentWorkouts = ref<WorkoutRecord[]>([]);
const templateSource = ref('');
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
const latestWorkout = computed(() => recentWorkouts.value[0] ?? null);

function confirmStartedAt(value: string | number): void {
  formData.startedAt = dayjs(value).format('YYYY-MM-DD HH:mm:ss');
  datePickerVisible.value = false;
}

function optionalNumber(value: number | string): number | undefined {
  if (value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function applyWorkoutTemplate(workout: WorkoutRecord, announce = true): void {
  formData.type = workout.type;
  formData.name = workout.name;
  formData.durationMinutes = workout.durationMinutes;
  formData.calories = workout.calories ?? '';
  formData.note = workout.note ?? '';
  templateSource.value = `${dayjs(workout.startedAt).format('M月D日')} · ${workout.name}`;
  if (announce) ToastPlugin.success('已带入上次训练，可继续修改');
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
      await router.replace(`/workouts/${workoutId.value}`);
    } else {
      const created = await createWorkout(input);
      ToastPlugin.success('训练记录已保存');
      await router.replace(`/workouts/${created.id}`);
    }
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
  try {
    if (workoutId.value) {
      const workout = await getWorkout(workoutId.value);
      formData.type = workout.type;
      formData.name = workout.name;
      formData.startedAt = dayjs(workout.startedAt).format('YYYY-MM-DD HH:mm:ss');
      formData.durationMinutes = workout.durationMinutes;
      formData.calories = workout.calories ?? '';
      formData.note = workout.note ?? '';
      return;
    }

    const result = await getWorkouts({ page: 1, pageSize: 8 });
    recentWorkouts.value = result.data;
    if (copyFromId.value) {
      const source =
        result.data.find((workout) => workout.id === copyFromId.value) ??
        (await getWorkout(copyFromId.value));
      applyWorkoutTemplate(source, false);
    }
  } catch {
    if (workoutId.value || copyFromId.value) await router.replace('/workouts');
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
        <div v-if="!isEdit && latestWorkout" class="quick-start field-block">
          <div>
            <span class="field-label">快速开始</span>
            <small>带入训练内容，开始时间仍使用现在</small>
          </div>
          <button type="button" @click="applyWorkoutTemplate(latestWorkout)">
            <span>
              <strong>复用上次训练</strong>
              <small> {{ latestWorkout.name }} · {{ latestWorkout.durationMinutes }} 分钟 </small>
            </span>
            <span>{{ templateSource || '带入' }}</span>
          </button>
        </div>

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
              <span class="workout-type-grid__icon"><SportIcon :type="item.value" /></span>
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
    font-size: 0.9375rem;
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
  font-size: 0.875rem;
  font-weight: 750;
}

.quick-start {
  padding-bottom: 20px;
  border-bottom: 1px solid var(--color-border);

  > div {
    display: grid;
    gap: 3px;

    small {
      color: var(--color-text-tertiary);
      font-size: 0.7rem;
    }
  }

  > button {
    display: flex;
    width: 100%;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px;
    color: var(--color-text-primary);
    text-align: left;
    background: var(--color-surface-muted);
    border: 0;
    border-radius: 10px;

    > span:first-child {
      display: grid;
      min-width: 0;
      gap: 3px;
    }

    strong {
      font-size: 0.85rem;
    }

    small {
      color: var(--color-text-secondary);
      font-size: 0.72rem;
    }

    > span:last-child {
      flex: none;
      color: var(--color-accent-text);
      font-size: 0.7rem;
      font-weight: 750;
    }
  }
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
      font-size: 0.875rem;
    }

    &.active {
      color: var(--color-text-primary);
      background: var(--color-primary-light);
      border-color: var(--color-primary);
    }
  }

  &__icon {
    color: var(--color-text-primary);
    font-size: 1.2rem;
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

.note-field {
  margin-bottom: 22px;
}

@media (max-width: 360px) {
  .workout-type-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
