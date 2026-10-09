<script setup lang="ts">
import EmptyState from '@/components/EmptyState.vue';
import { showRequestError } from '@/utils/request-error';
import type { MealRecord, MealType } from '@fit-trace/shared';
import dayjs from 'dayjs';
import { Button, DialogPlugin, Loading, ToastPlugin } from 'tdesign-mobile-vue';
import { AddIcon, DeleteIcon, EditIcon, ForkIcon } from 'tdesign-icons-vue-next';
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { deleteMeal, getMeals } from '@/api/meals';
import RecordDetailHeader from '@/components/RecordDetailHeader.vue';

const mealLabels: Record<MealType, string> = {
  BREAKFAST: '早餐',
  LUNCH: '午餐',
  DINNER: '晚餐',
  SNACK: '加餐',
};
const filters: Array<{ value: MealType | 'ALL'; label: string }> = [
  { value: 'ALL', label: '全部' },
  { value: 'BREAKFAST', label: '早餐' },
  { value: 'LUNCH', label: '午餐' },
  { value: 'DINNER', label: '晚餐' },
  { value: 'SNACK', label: '加餐' },
];
const router = useRouter();
const activeType = ref<MealType | 'ALL'>('ALL');
const meals = ref<MealRecord[]>([]);
const loading = ref(true);
const loadingMore = ref(false);
const page = ref(1);
const total = ref(0);
const pageSize = 20;
const groupedMeals = computed(() => {
  const groups = new Map<string, MealRecord[]>();
  for (const meal of meals.value) {
    const key = dayjs(meal.recordedAt).format('YYYY-MM-DD');
    groups.set(key, [...(groups.get(key) ?? []), meal]);
  }
  return [...groups.entries()].map(([date, items]) => ({ date, items }));
});

function dateTitle(date: string): string {
  const value = dayjs(date);
  if (value.isSame(dayjs(), 'day')) return '今天';
  if (value.isSame(dayjs().subtract(1, 'day'), 'day')) return '昨天';
  return value.format('M月D日');
}
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
  } catch (error) {
    page.value -= 1;
    showRequestError(error, '加载更多饮食记录失败');
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
  } catch (error) {
    showRequestError(error, '饮食记录加载失败');
  } finally {
    loading.value = false;
  }
}
function confirmDelete(meal: MealRecord): void {
  let deleting = false;
  const dialog = DialogPlugin.confirm({
    title: '删除这条饮食记录？',
    content: `${dayjs(meal.recordedAt).format('M月D日 HH:mm')} · ${mealLabels[meal.type]}，删除后无法恢复`,
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
        showRequestError(error, '删除失败，请稍后重试');
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
    <RecordDetailHeader
      title="饮食日记"
      subtitle="按餐次记录，回顾每天真实的饮食"
      action-label="添加"
      @action="router.push('/meals/create')"
    />

    <div class="meal-filter filter-tabs" aria-label="按餐次筛选">
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

    <Loading
      class="page-loading"
      :class="{ 'page-loading--active': loading }"
      :loading="loading"
      text="正在读取饮食记录"
    >
      <EmptyState
        v-if="!loading && meals.length === 0"
        class="empty-state"
        title="还没有饮食记录"
        description="从今天的一餐开始，建立真实的饮食轨迹"
      >
        <template #image><ForkIcon class="empty-icon" /></template>
        <template #action
          ><Button theme="primary" @click="router.push('/meals/create')"
            >记录第一餐</Button
          ></template
        >
      </EmptyState>

      <div v-else class="diary-list">
        <section v-for="group in groupedMeals" :key="group.date" class="diary-day">
          <div class="diary-day__heading">
            <div>
              <strong>{{ dateTitle(group.date) }}</strong
              ><span>{{ dayjs(group.date).format('YYYY年M月D日') }}</span>
            </div>
            <span>{{ group.items.length }} 条记录</span>
          </div>
          <div class="diary-day__body">
            <article
              v-for="meal in group.items"
              :key="meal.id"
              class="meal-row"
              role="button"
              tabindex="0"
              @click="router.push(`/meals/${meal.id}`)"
              @keydown.enter="router.push(`/meals/${meal.id}`)"
            >
              <div class="meal-row__time">{{ dayjs(meal.recordedAt).format('HH:mm') }}</div>
              <div class="meal-row__content">
                <div class="meal-row__title">
                  <div class="meal-row__label">
                    <img
                      v-if="meal.imageUrl"
                      class="meal-row__thumb"
                      :src="meal.imageUrl"
                      :alt="`${mealLabels[meal.type]}照片`"
                      loading="lazy"
                    />
                    <strong>{{ mealLabels[meal.type] }}</strong>
                  </div>
                  <span v-if="meal.totalCalories !== null">{{ meal.totalCalories }} kcal</span>
                </div>
                <div class="food-list">
                  <div v-for="food in meal.foods" :key="food.id">
                    <span class="food-name"
                      >{{ food.name
                      }}<small v-if="food.aiGenerated" class="food-ai-tag">AI</small></span
                    >
                    <small>{{
                      food.amount || (food.calories !== null ? `${food.calories} kcal` : '')
                    }}</small>
                  </div>
                </div>
                <p v-if="meal.note">{{ meal.note }}</p>
                <div class="meal-row__actions">
                  <Button
                    size="small"
                    variant="text"
                    @click.stop="
                      router.push({ path: '/meals/create', query: { copyFrom: meal.id } })
                    "
                    ><AddIcon /> 再记一次</Button
                  >
                  <Button
                    size="small"
                    variant="text"
                    @click.stop="router.push(`/meals/${meal.id}/edit`)"
                    ><EditIcon /> 编辑</Button
                  >
                  <Button
                    size="small"
                    variant="text"
                    theme="danger"
                    @click.stop="confirmDelete(meal)"
                    ><DeleteIcon /> 删除</Button
                  >
                </div>
              </div>
            </article>
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
        >加载更多</Button
      >
    </Loading>
  </main>
</template>

<style scoped lang="scss">
.meals-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  padding: 24px 0 18px;
  h1 {
    margin: 0 0 4px;
    font-size: 1.55rem;
    font-weight: 600;
  }
  p {
    margin: 0;
    color: var(--color-text-secondary);
    font-size: 0.875rem;
  }
}

.empty-icon {
  color: var(--color-text-tertiary);
  font-size: 1.5rem;
}
.diary-list {
  display: grid;
  gap: 24px;
}
.diary-day__heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 9px;
  > div {
    display: flex;
    align-items: baseline;
    gap: 8px;
  }
  strong {
    font-size: 1rem;
  }
  span {
    color: var(--color-text-tertiary);
    font-size: 0.75rem;
  }
}
.diary-day__body {
  overflow: hidden;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius-md);
}
.meal-row {
  display: grid;
  grid-template-columns: 45px minmax(0, 1fr);
  padding: 15px 14px;
  cursor: pointer;
  transition:
    background-color var(--duration-fast) var(--ease-standard),
    transform var(--duration-fast) var(--ease-standard);

  &:active {
    background: var(--color-surface-muted);
    transform: scale(0.995);
  }
  + .meal-row {
    border-top: 1px solid var(--color-border);
  }
  &__time {
    padding-top: 2px;
    color: var(--color-text-tertiary);
    font-size: 0.75rem;
    font-variant-numeric: tabular-nums;
  }
  &__content {
    min-width: 0;
  }
  &__title {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 9px;
    strong {
      font-size: 0.9375rem;
    }
    span {
      color: var(--color-text-secondary);
      font-size: 0.75rem;
    }
  }
  &__label {
    display: flex;
    min-width: 0;
    align-items: center;
    gap: 8px;
  }
  &__thumb {
    width: 32px;
    height: 32px;
    flex: none;
    object-fit: cover;
    background: var(--color-surface-muted);
    border-radius: 8px;
  }
  p {
    margin: 9px 0 0;
    color: var(--color-text-secondary);
    font-size: 0.75rem;
    line-height: 1.5;
  }
  &__actions {
    display: flex;
    justify-content: flex-end;
    gap: 2px;
    margin: 5px -8px -8px 0;
  }
}
.food-list {
  display: grid;
  gap: 7px;
  div {
    display: flex;
    justify-content: space-between;
    gap: 12px;
  }
  span {
    overflow: hidden;
    color: var(--color-text-primary);
    font-size: 0.875rem;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  small {
    flex: none;
    color: var(--color-text-tertiary);
    font-size: 0.75rem;
  }

  .food-ai-tag {
    margin-left: 5px;
    padding: 1px 4px;
    color: var(--color-text-secondary);
    font-size: 0.75rem;
    font-weight: 500;
    background: var(--color-surface-muted);
    border-radius: 4px;
  }
}
.load-more {
  margin-top: var(--spacing-md);
}
</style>
