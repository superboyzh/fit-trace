<script setup lang="ts">
import type { ApiErrorResponse, MealRecord, MealType } from '@fit-trace/shared';
import axios from 'axios';
import dayjs from 'dayjs';
import { Button, DialogPlugin, Empty, Loading, Tag, ToastPlugin } from 'tdesign-mobile-vue';
import { AddIcon, DeleteIcon, EditIcon, ForkIcon } from 'tdesign-icons-vue-next';
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { deleteMeal, getMeals } from '@/api/meals';

const mealLabels: Record<MealType, { label: string; emoji: string }> = {
  BREAKFAST: { label: '早餐', emoji: '☀️' },
  LUNCH: { label: '午餐', emoji: '🥗' },
  DINNER: { label: '晚餐', emoji: '🌙' },
  SNACK: { label: '加餐', emoji: '🍎' },
};

const router = useRouter();
const filters: Array<{ value: MealType | 'ALL'; label: string }> = [
  { value: 'ALL', label: '全部' },
  { value: 'BREAKFAST', label: '早餐' },
  { value: 'LUNCH', label: '午餐' },
  { value: 'DINNER', label: '晚餐' },
  { value: 'SNACK', label: '加餐' },
];
const activeType = ref<MealType | 'ALL'>('ALL');
const meals = ref<MealRecord[]>([]);
const loading = ref(true);
const loadingMore = ref(false);
const page = ref(1);
const total = ref(0);
const pageSize = 20;

async function load(reset = false): Promise<void> {
  if (reset) {
    page.value = 1;
    meals.value = [];
  }
  const result = await getMeals({
    page: page.value,
    pageSize,
    ...(activeType.value === 'ALL' ? {} : { type: activeType.value }),
  });
  meals.value.push(...result.data);
  total.value = result.meta.total;
}

async function loadMore(): Promise<void> {
  loadingMore.value = true;
  page.value += 1;
  try {
    await load();
  } catch {
    page.value -= 1;
    ToastPlugin.error('加载更多饮食记录失败');
  } finally {
    loadingMore.value = false;
  }
}

async function selectType(type: MealType | 'ALL'): Promise<void> {
  if (type === activeType.value) return;
  activeType.value = type;
  loading.value = true;
  try {
    await load(true);
  } catch {
    ToastPlugin.error('饮食记录加载失败');
  } finally {
    loading.value = false;
  }
}

function confirmDelete(meal: MealRecord): void {
  let deleting = false;
  const dialog = DialogPlugin.confirm({
    title: '删除这条饮食记录？',
    content: `${dayjs(meal.recordedAt).format('M月D日 HH:mm')} · ${mealLabels[meal.type].label}，删除后无法恢复。`,
    confirmBtn: { content: '删除', theme: 'danger' },
    cancelBtn: '取消',
    onConfirm: async () => {
      if (deleting) return;
      deleting = true;
      dialog.update({ confirmBtn: { content: '删除中…', theme: 'danger', loading: true } });
      try {
        await deleteMeal(meal.id);
        meals.value = meals.value.filter((item) => item.id !== meal.id);
        total.value -= 1;
        ToastPlugin.success('饮食记录已删除');
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
  <main class="view-page meals-page">
    <header class="meals-header">
      <div>
        <span class="page-header__eyebrow">Meal History</span>
        <h1>饮食记录</h1>
        <p>如实记录每一餐，慢慢找到适合自己的节奏。</p>
      </div>
      <Button class="new-meal-button" shape="round" @click="router.push('/meals/create')">
        <AddIcon /> 新记录
      </Button>
    </header>

    <div class="meal-filter" aria-label="按餐次筛选">
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

    <Loading class="page-loading" :loading="loading" text="正在读取饮食记录">
      <Empty
        v-if="!loading && meals.length === 0"
        class="empty-state"
        title="还没有饮食记录"
        description="从今天的一餐开始，建立真实的饮食轨迹。"
      >
        <template #image><ForkIcon class="empty-icon" /></template>
        <template #action>
          <Button theme="primary" @click="router.push('/meals/create')">记录第一餐</Button>
        </template>
      </Empty>

      <div v-else class="meal-list">
        <section v-for="meal in meals" :key="meal.id" class="surface-card meal-card">
          <div class="meal-card__heading">
            <div class="meal-type-icon">{{ mealLabels[meal.type].emoji }}</div>
            <div>
              <div class="meal-card__title">
                <strong>{{ mealLabels[meal.type].label }}</strong>
                <Tag v-if="dayjs(meal.recordedAt).isSame(dayjs(), 'day')" variant="light">
                  今天
                </Tag>
              </div>
              <span>{{ dayjs(meal.recordedAt).format('YYYY年M月D日 HH:mm') }}</span>
            </div>
            <div v-if="meal.totalCalories !== null" class="meal-card__calories">
              <strong>{{ meal.totalCalories }}</strong
              ><span>kcal</span>
            </div>
          </div>

          <div class="food-summary">
            <div v-for="food in meal.foods" :key="food.id" class="food-summary__item">
              <div>
                <span class="food-meal-tag">{{ mealLabels[meal.type].label }}</span>
                <strong>{{ food.name }}</strong>
                <span v-if="food.amount">{{ food.amount }}</span>
              </div>
              <span v-if="food.calories !== null">{{ food.calories }} kcal</span>
            </div>
          </div>

          <p v-if="meal.note" class="meal-card__note">{{ meal.note }}</p>
          <div class="meal-card__actions">
            <Button size="small" variant="text" @click="router.push(`/meals/${meal.id}`)">
              <EditIcon /> 编辑
            </Button>
            <Button size="small" variant="text" theme="danger" @click="confirmDelete(meal)">
              <DeleteIcon /> 删除
            </Button>
          </div>
        </section>
      </div>

      <Button
        v-if="meals.length < total"
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
.meals-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  padding: 30px 0 22px;

  h1 {
    margin: 5px 0;
    font-size: 1.8rem;
  }

  p {
    max-width: 310px;
    margin: 0;
    color: var(--color-text-secondary);
    font-size: 0.76rem;
    line-height: 1.5;
  }
}

.new-meal-button.t-button {
  flex: none;
  color: var(--color-ink);
  background: var(--color-primary);
  border-color: var(--color-primary);
}

.meal-filter {
  display: flex;
  gap: 6px;
  margin-bottom: 14px;
  overflow-x: auto;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }

  button {
    min-width: 58px;
    flex: 1 0 auto;
    padding: 9px 13px;
    color: var(--color-text-secondary);
    font-size: 0.7rem;
    font-weight: 750;
    background: var(--color-surface-muted);
    border: 1px solid transparent;
    border-radius: 999px;

    &.active {
      color: #fff;
      background: var(--color-ink);
      border-color: var(--color-ink);
    }
  }
}

.empty-state {
  width: 100%;
  padding: 52px 18px;
  background: var(--color-surface);
  border-radius: var(--border-radius-md);
}

.empty-icon {
  color: var(--color-text-tertiary);
  font-size: 3.2rem;
}

.meal-list {
  display: grid;
  width: 100%;
  min-width: 0;
  gap: 12px;
}

.meal-card {
  width: 100%;
  min-width: 0;
  padding: 16px;
  &__heading {
    display: flex;
    align-items: center;
    gap: 11px;

    > div:nth-child(2) {
      display: grid;
      min-width: 0;
      flex: 1;
      gap: 3px;

      > span {
        color: var(--color-text-tertiary);
        font-size: 0.68rem;
      }
    }
  }

  &__title {
    display: flex;
    align-items: center;
    gap: 7px;
  }

  &__calories {
    display: grid;
    flex: none;
    text-align: right;

    strong {
      font-size: 1rem;
    }

    span {
      color: var(--color-text-tertiary);
      font-size: 0.58rem;
    }
  }

  &__note {
    margin: 10px 0 0;
    color: var(--color-text-secondary);
    font-size: 0.72rem;
    line-height: 1.55;
  }

  &__actions {
    display: flex;
    justify-content: flex-end;
    gap: 4px;
    margin: 8px -7px -7px 0;
  }
}

.meal-type-icon {
  display: grid;
  width: 42px;
  height: 42px;
  flex: none;
  place-items: center;
  font-size: 1.25rem;
  background: var(--color-primary-light);
  border-radius: 11px;
}

.food-summary {
  display: grid;
  gap: 1px;
  margin-top: 14px;
  overflow: hidden;
  background: var(--color-border);
  border: 1px solid var(--color-border);
  border-radius: 11px;

  &__item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 10px 12px;
    background: var(--color-surface-muted);

    > div {
      display: flex;
      min-width: 0;
      align-items: baseline;
      gap: 7px;
    }

    .food-meal-tag {
      padding: 2px 5px;
      color: var(--color-ink);
      font-size: 0.56rem;
      font-weight: 750;
      background: var(--color-primary-light);
      border-radius: 4px;
    }

    strong {
      overflow: hidden;
      font-size: 0.75rem;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    span {
      flex: none;
      color: var(--color-text-tertiary);
      font-size: 0.65rem;
    }
  }
}

.load-more {
  margin-top: 14px;
}

@media (max-width: 380px) {
  .meals-header {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
