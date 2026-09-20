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
import {
  AddIcon,
  CalendarIcon,
  CameraIcon,
  CheckIcon,
  ChevronLeftIcon,
  DeleteIcon,
} from 'tdesign-icons-vue-next';
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { recognizeFood } from '@/api/ai';
import { createMeal, getMeal, updateMeal, type MealInput } from '@/api/meals';
import { uploadImage } from '@/api/uploads';

interface EditableFood {
  key: number;
  name: string;
  amount: string;
  calories: string | number;
  aiGenerated: boolean;
}

interface FoodSuggestion extends EditableFood {
  selected: boolean;
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
const uploadingPhoto = ref(false);
const recognizing = ref(false);
const imageUrl = ref('');
const recognitionProvider = ref('');
const suggestions = ref<FoodSuggestion[]>([]);
const fileInput = ref<HTMLInputElement | null>(null);
let foodKey = 1;
const formData = reactive({
  type: 'BREAKFAST' as MealType,
  recordedAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
  note: '',
  foods: [
    { key: foodKey, name: '', amount: '', calories: '', aiGenerated: false },
  ] as EditableFood[],
});
const recordedAtDisplay = computed(() => dayjs(formData.recordedAt).format('YYYY-MM-DD HH:mm'));
const selectedMealLabel = computed(
  () => mealTypes.find((item) => item.value === formData.type)?.label ?? '这一餐',
);

function addFood(): void {
  foodKey += 1;
  formData.foods.push({ key: foodKey, name: '', amount: '', calories: '', aiGenerated: false });
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

function pickPhoto(): void {
  if (uploadingPhoto.value) return;
  fileInput.value?.click();
}

async function onPhotoChange(event: Event): Promise<void> {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  target.value = '';
  if (!file) return;

  uploadingPhoto.value = true;
  try {
    const uploaded = await uploadImage(file);
    imageUrl.value = uploaded.url;
    await recognizePhoto();
  } catch (error) {
    ToastPlugin.error(resolveErrorMessage(error, '照片上传失败，请稍后重试'));
  } finally {
    uploadingPhoto.value = false;
  }
}

async function recognizePhoto(): Promise<void> {
  if (!imageUrl.value || recognizing.value) return;
  recognizing.value = true;
  try {
    const result = await recognizeFood(imageUrl.value);
    recognitionProvider.value = result.provider;
    suggestions.value = result.foods.map((food) => ({
      key: ++foodKey,
      name: food.name,
      amount: food.estimatedAmount ?? '',
      calories: food.estimatedCalories ?? '',
      aiGenerated: true,
      selected: true,
    }));
    if (suggestions.value.length === 0) {
      ToastPlugin.warning('没有识别到食物，请手动添加');
    }
  } catch (error) {
    ToastPlugin.error(resolveErrorMessage(error, '识别失败，请手动填写'));
  } finally {
    recognizing.value = false;
  }
}

function removePhoto(): void {
  imageUrl.value = '';
  recognitionProvider.value = '';
  suggestions.value = [];
}

function toggleSuggestion(key: number): void {
  suggestions.value = suggestions.value.map((item) =>
    item.key === key ? { ...item, selected: !item.selected } : item,
  );
}

function applySuggestions(): void {
  const picked = suggestions.value.filter((item) => item.selected);
  if (picked.length === 0) {
    ToastPlugin.warning('请先勾选要添加的食物');
    return;
  }
  const isEmptyRow = formData.foods.every((food) => !food.name.trim());
  const nextFoods = isEmptyRow ? [] : [...formData.foods];
  for (const item of picked) {
    foodKey += 1;
    nextFoods.push({
      key: foodKey,
      name: item.name,
      amount: item.amount,
      calories: item.calories,
      aiGenerated: true,
    });
  }
  formData.foods = nextFoods;
  suggestions.value = [];
  ToastPlugin.success(`已添加 ${picked.length} 种食物，可继续修改`);
}

function resolveErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError<ApiErrorResponse>(error)) return error.response?.data.message ?? fallback;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
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
      aiGenerated: food.aiGenerated,
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
    imageUrl: imageUrl.value || undefined,
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
    ToastPlugin.error(resolveErrorMessage(error, '保存失败，请稍后重试'));
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
    imageUrl.value = meal.imageUrl ?? '';
    formData.foods = meal.foods.map((food) => ({
      key: ++foodKey,
      name: food.name,
      amount: food.amount ?? '',
      calories: food.calories ?? '',
      aiGenerated: food.aiGenerated,
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
          <span class="field-label">餐食照片（可选）</span>

          <div v-if="imageUrl" class="photo-preview">
            <img :src="imageUrl" alt="餐食照片" />
            <div class="photo-preview__actions">
              <Button size="small" variant="outline" :loading="recognizing" @click="recognizePhoto">
                重新识别
              </Button>
              <Button size="small" variant="text" theme="danger" @click="removePhoto">
                <DeleteIcon /> 移除
              </Button>
            </div>
          </div>

          <button v-else type="button" class="photo-picker" @click="pickPhoto">
            <CameraIcon />
            <strong>{{ uploadingPhoto ? '正在上传…' : '拍照或选择餐食照片' }}</strong>
            <span>上传后先由 AI 识别，再由你确认</span>
          </button>

          <div v-if="recognizing && !suggestions.length" class="recognizing-hint">
            正在识别这张照片…
          </div>

          <div v-if="suggestions.length" class="suggestion-panel">
            <header>
              <div>
                <strong>识别结果</strong>
                <span>{{
                  recognitionProvider === 'mock'
                    ? '当前为模拟识别，不会分析照片，请手动调整'
                    : `${recognitionProvider} 识别，点名称可直接修改`
                }}</span>
              </div>
              <Button size="small" variant="outline" @click="applySuggestions">添加所选</Button>
            </header>
            <div class="suggestion-list">
              <div
                v-for="item in suggestions"
                :key="item.key"
                class="suggestion-item"
                :class="{ selected: item.selected }"
              >
                <button
                  type="button"
                  class="suggestion-item__check"
                  :aria-pressed="item.selected"
                  :aria-label="item.selected ? `取消选择${item.name}` : `选择${item.name}`"
                  @click="toggleSuggestion(item.key)"
                >
                  <CheckIcon v-if="item.selected" />
                </button>
                <span class="suggestion-item__main">
                  <Input
                    v-model="item.name"
                    class="suggestion-item__name"
                    :maxlength="100"
                    placeholder="食物名称"
                  />
                  <span>{{ item.amount || '份量未知' }}</span>
                </span>
                <span class="suggestion-item__calories">
                  {{ item.calories === '' ? '—' : item.calories }}<small>kcal</small>
                </span>
              </div>
            </div>
            <p class="suggestion-tip">
              识别有误时直接改上面的名称，或取消勾选后手动添加；改名后热量仍按原来那道菜估算，加入明细后请随手核对。
            </p>
          </div>
        </div>

        <input
          ref="fileInput"
          class="file-input"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          @change="onPhotoChange"
        />

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
            <small>以下食物均属于：{{ selectedMealLabel }}</small>
          </div>
          <Button size="small" variant="outline" @click="addFood"><AddIcon /> 添加</Button>
        </div>

        <div class="food-list">
          <section v-for="(food, index) in formData.foods" :key="food.key" class="food-item">
            <div class="food-item__header">
              <div>
                <strong>食物 {{ index + 1 }}</strong>
                <span>{{ selectedMealLabel }}</span>
                <span v-if="food.aiGenerated" class="food-item__ai">AI 识别</span>
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

.file-input {
  display: none;
}

.photo-picker {
  display: grid;
  justify-items: center;
  gap: 5px;
  padding: 20px 14px;
  color: var(--color-text-secondary);
  background: var(--color-surface-muted);
  border: 1px dashed var(--color-border);
  border-radius: var(--border-radius-md);

  svg {
    color: var(--color-ink);
    font-size: 1.4rem;
  }

  strong {
    color: var(--color-ink);
    font-size: 0.78rem;
  }

  span {
    color: var(--color-text-tertiary);
    font-size: 0.64rem;
  }
}

.photo-preview {
  display: grid;
  gap: 9px;

  img {
    width: 100%;
    max-height: 220px;
    object-fit: cover;
    background: var(--color-surface-muted);
    border-radius: var(--border-radius-md);
  }

  &__actions {
    display: flex;
    justify-content: flex-end;
    gap: 4px;
  }
}

.recognizing-hint {
  padding: 12px;
  color: var(--color-text-secondary);
  font-size: 0.7rem;
  text-align: center;
  background: var(--color-surface-muted);
  border-radius: var(--border-radius-md);
}

.suggestion-panel {
  margin-top: 3px;
  padding: 13px;
  background: var(--color-primary-light);
  border: 1px solid #dce9bd;
  border-radius: var(--border-radius-md);

  > header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 10px;

    > div {
      display: grid;
      gap: 3px;
    }

    strong {
      font-size: 0.78rem;
    }

    span {
      color: var(--color-text-secondary);
      font-size: 0.62rem;
    }
  }
}

.suggestion-list {
  display: grid;
  gap: 6px;
}

.suggestion-item {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 9px;
  padding: 10px 11px;
  background: rgb(255 255 255 / 72%);
  border: 1px solid transparent;
  border-radius: 9px;

  &__check {
    display: grid;
    width: 18px;
    height: 18px;
    flex: none;
    place-items: center;
    color: var(--color-ink);
    font-size: 0.7rem;
    background: #fff;
    border: 1px solid var(--color-border);
    border-radius: 5px;
  }

  &__main {
    display: grid;
    min-width: 0;
    flex: 1;
    gap: 2px;

    span {
      color: var(--color-text-tertiary);
      font-size: 0.62rem;
    }
  }

  &__name {
    width: 100%;

    :deep(.t-input) {
      height: auto;
      padding: 0;
      background: transparent;
      border: 0;
      border-radius: 0;
      box-shadow: none;

      &:hover,
      &:focus-within {
        border: 0;
        box-shadow: none;
      }
    }

    :deep(input) {
      height: auto;
      padding: 0;
      color: var(--color-text-primary);
      font-size: 0.76rem;
      font-weight: 750;
    }
  }

  &__calories {
    flex: none;
    font-size: 0.74rem;
    font-weight: 750;
    font-variant-numeric: tabular-nums;

    small {
      margin-left: 2px;
      color: var(--color-text-tertiary);
      font-size: 0.55rem;
      font-weight: 500;
    }
  }

  &.selected {
    border-color: var(--color-primary);

    .suggestion-item__check {
      background: var(--color-primary);
      border-color: var(--color-primary);
    }
  }
}

.suggestion-tip {
  margin: 10px 0 0;
  color: var(--color-text-secondary);
  font-size: 0.62rem;
  line-height: 1.6;
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

      .food-item__ai {
        color: var(--color-text-secondary);
        background: #e7ece6;
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
}
</style>
