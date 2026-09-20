<script setup lang="ts">
import type { ApiErrorResponse, MealType } from '@fit-trace/shared';
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
import { AddIcon, CalendarIcon, ChevronLeftIcon, DeleteIcon } from 'tdesign-icons-vue-next';
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { createMeal, getMeal, updateMeal, type MealInput } from '@/api/meals';

interface EditableFood {
  key: number;
  name: string;
  amount: string;
  calories: string | number;
}

const mealTypes: Array<{ value: MealType; label: string; time: string }> = [
  { value: 'BREAKFAST', label: '早餐', time: '06:00–10:00' },
  { value: 'LUNCH', label: '午餐', time: '11:00–14:00' },
  { value: 'DINNER', label: '晚餐', time: '17:00–21:00' },
  { value: 'SNACK', label: '加餐', time: '其他时间' },
];

const route = useRoute();
const router = useRouter();
const mealId = computed(() => (typeof route.params.id === 'string' ? route.params.id : null));
const isEdit = computed(() => Boolean(mealId.value));
const loading = ref(Boolean(mealId.value));
const submitting = ref(false);
const datePickerVisible = ref(false);
let foodKey = 1;
const formData = reactive({
  type: 'BREAKFAST' as MealType,
  recordedAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
  note: '',
  foods: [{ key: foodKey, name: '', amount: '', calories: '' }] as EditableFood[],
});
const recordedAtDisplay = computed(() => dayjs(formData.recordedAt).format('YYYY-MM-DD HH:mm'));

function addFood(): void {
  foodKey += 1;
  formData.foods.push({ key: foodKey, name: '', amount: '', calories: '' });
}

function removeFood(key: number): void {
  if (formData.foods.length === 1) {
    ToastPlugin.warning('至少保留一种食物');
    return;
  }
  formData.foods = formData.foods.filter((food) => food.key !== key);
}

function confirmRecordedAt(value: string | number): void {
  formData.recordedAt = dayjs(value).format('YYYY-MM-DD HH:mm:ss');
  datePickerVisible.value = false;
}

function buildInput(): MealInput | null {
  const foods = formData.foods
    .map((food) => ({
      name: food.name.trim(),
      amount: food.amount.trim() || undefined,
      calories:
        food.calories === '' || !Number.isFinite(Number(food.calories))
          ? undefined
          : Number(food.calories),
    }))
    .filter((food) => food.name);
  if (foods.length === 0) {
    ToastPlugin.warning('请至少填写一种食物');
    return null;
  }
  if (foods.length !== formData.foods.length) {
    ToastPlugin.warning('请填写所有食物名称，或删除空白项');
    return null;
  }
  return {
    type: formData.type,
    recordedAt: dayjs(formData.recordedAt).toISOString(),
    note: formData.note.trim() || undefined,
    foods,
  };
}

async function submit(): Promise<void> {
  if (submitting.value) return;
  const input = buildInput();
  if (!input) return;
  submitting.value = true;
  try {
    if (mealId.value) {
      await updateMeal(mealId.value, input);
      ToastPlugin.success('饮食记录已更新');
    } else {
      await createMeal(input);
      ToastPlugin.success('饮食记录已保存');
    }
    await router.replace('/meals');
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
  if (!mealId.value) return;
  try {
    const meal = await getMeal(mealId.value);
    formData.type = meal.type;
    formData.recordedAt = dayjs(meal.recordedAt).format('YYYY-MM-DD HH:mm:ss');
    formData.note = meal.note ?? '';
    formData.foods = meal.foods.map((food) => ({
      key: ++foodKey,
      name: food.name,
      amount: food.amount ?? '',
      calories: food.calories ?? '',
    }));
  } catch {
    await router.replace('/meals');
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <main class="view-page meal-form-page">
    <header class="meal-form-header">
      <Button variant="text" shape="round" @click="router.back()">
        <ChevronLeftIcon /> 返回
      </Button>
      <h1>{{ isEdit ? '编辑饮食记录' : '记录这一餐' }}</h1>
      <p>先如实记录，不必追求每一项都绝对精确。</p>
    </header>

    <Loading class="page-loading" :loading="loading" text="正在读取饮食记录">
      <section class="surface-card meal-form-card">
        <div class="field-block">
          <span class="field-label">餐次</span>
          <div class="meal-type-grid">
            <button
              v-for="item in mealTypes"
              :key="item.value"
              type="button"
              :class="{ active: formData.type === item.value }"
              @click="formData.type = item.value"
            >
              <strong>{{ item.label }}</strong>
              <span>{{ item.time }}</span>
            </button>
          </div>
        </div>

        <div class="field-block">
          <span class="field-label">记录时间</span>
          <Input :model-value="recordedAtDisplay" readonly @click="datePickerVisible = true">
            <template #suffix-icon><CalendarIcon /></template>
          </Input>
        </div>

        <div class="foods-heading">
          <div>
            <span class="field-label">食物明细</span>
            <small>
              以下食物均属于：{{ mealTypes.find((item) => item.value === formData.type)?.label }}
            </small>
          </div>
          <Button size="small" variant="outline" @click="addFood"><AddIcon /> 添加</Button>
        </div>

        <div class="food-list">
          <section v-for="(food, index) in formData.foods" :key="food.key" class="food-item">
            <div class="food-item__header">
              <div>
                <strong>食物 {{ index + 1 }}</strong>
                <span>{{ mealTypes.find((item) => item.value === formData.type)?.label }}</span>
              </div>
              <Button size="small" variant="text" theme="danger" @click="removeFood(food.key)">
                <DeleteIcon /> 删除
              </Button>
            </div>
            <Input v-model="food.name" :maxlength="100" placeholder="名称，如鸡胸肉" />
            <div class="food-item__details">
              <Input v-model="food.amount" :maxlength="50" placeholder="份量，如 150g" />
              <Input v-model="food.calories" type="number" suffix="kcal" placeholder="热量" />
            </div>
          </section>
        </div>

        <div class="field-block note-field">
          <span class="field-label">备注</span>
          <Textarea
            v-model="formData.note"
            :maxlength="500"
            :autosize="{ minRows: 3, maxRows: 6 }"
            placeholder="例如：自制、少油、外食等"
          />
        </div>

        <Button theme="primary" size="large" block :loading="submitting" @click="submit">
          {{ isEdit ? '保存修改' : '保存饮食记录' }}
        </Button>
      </section>
    </Loading>

    <Popup v-model="datePickerVisible" placement="bottom">
      <DateTimePicker
        :value="formData.recordedAt"
        title="选择记录时间"
        :mode="['date', 'minute']"
        format="YYYY-MM-DD HH:mm:ss"
        @confirm="confirmRecordedAt"
        @cancel="datePickerVisible = false"
      />
    </Popup>
  </main>
</template>

<style scoped lang="scss">
.meal-form-header {
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

.meal-form-card {
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

.meal-type-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 7px;

  button {
    display: grid;
    place-items: start;
    gap: 3px;
    min-width: 0;
    padding: 12px 4px;
    color: var(--color-text-secondary);
    background: var(--color-surface-muted);
    border: 1px solid transparent;
    border-radius: 9px;

    span {
      color: var(--color-text-tertiary);
      font-size: 0.55rem;
    }

    strong {
      font-size: 0.7rem;
    }

    &.active {
      color: var(--color-ink);
      background: var(--color-primary-light);
      border-color: var(--color-primary);
    }
  }
}

.foods-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 4px 0 10px;

  > div {
    display: grid;
    gap: 3px;
  }

  small {
    color: var(--color-text-tertiary);
    font-size: 0.62rem;
  }
}

.food-list {
  display: grid;
  gap: 10px;
}

.food-item {
  display: grid;
  gap: 2px;
  padding: 12px;
  background: var(--color-surface-muted);
  border: 1px solid var(--color-border);
  border-radius: 13px;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 2px;

    > div {
      display: flex;
      align-items: center;
      gap: 7px;

      strong {
        font-size: 0.75rem;
      }

      span {
        padding: 2px 6px;
        color: var(--color-ink);
        font-size: 0.58rem;
        font-weight: 750;
        background: var(--color-primary-light);
        border-radius: 5px;
      }
    }
  }

  &__details {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  :deep(.t-input) {
    background: #fff;
    border-radius: 9px;
  }
}

.note-field {
  margin-top: 20px;
}

@media (max-width: 360px) {
  .meal-type-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .food-item__details {
    grid-template-columns: 1fr;
  }
}
</style>
