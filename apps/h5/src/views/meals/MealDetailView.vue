<script setup lang="ts">
import { showRequestError } from '@/utils/request-error';
import type { MealRecord, MealType } from '@fit-trace/shared';
import dayjs from 'dayjs';
import { Button, DialogPlugin, Loading, ToastPlugin } from 'tdesign-mobile-vue';
import { DeleteIcon } from 'tdesign-icons-vue-next';
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { deleteMeal, getMeal } from '@/api/meals';
import RecordDetailHeader from '@/components/RecordDetailHeader.vue';

const mealLabels: Record<MealType, string> = {
  BREAKFAST: '早餐',
  LUNCH: '午餐',
  DINNER: '晚餐',
  SNACK: '加餐',
};

const route = useRoute();
const router = useRouter();
const mealId = computed(() => (typeof route.params.id === 'string' ? route.params.id : ''));
const loading = ref(true);
const meal = ref<MealRecord | null>(null);
const recordedAtText = computed(() =>
  meal.value ? dayjs(meal.value.recordedAt).format('YYYY年M月D日 HH:mm') : '',
);
const aiCount = computed(() => meal.value?.foods.filter((food) => food.aiGenerated).length ?? 0);

function confirmDelete(): void {
  const target = meal.value;
  if (!target) return;
  let deleting = false;
  const dialog = DialogPlugin.confirm({
    title: '删除这条饮食记录？',
    content: `${dayjs(target.recordedAt).format('YYYY年M月D日')} · ${mealLabels[target.type]}，删除后无法恢复`,
    confirmBtn: { content: '删除', theme: 'danger' },
    cancelBtn: '取消',
    onConfirm: async () => {
      if (deleting) return;
      deleting = true;
      dialog.update({ confirmBtn: { content: '删除中…', theme: 'danger', loading: true } });
      try {
        await deleteMeal(target.id);
        ToastPlugin.success('饮食记录已删除');
        dialog.destroy();
        await router.replace('/meals');
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
    meal.value = await getMeal(mealId.value);
  } catch (error) {
    showRequestError(error, '记录不存在或已被删除');
    await router.replace('/meals');
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <main class="view-page detail-page">
    <RecordDetailHeader
      title="饮食记录"
      :subtitle="recordedAtText"
      action-label="编辑"
      @action="router.push(`/meals/${mealId}/edit`)"
    />

    <Loading
      class="page-loading"
      :class="{ 'page-loading--active': loading }"
      :loading="loading"
      text="正在读取记录"
    >
      <template v-if="meal">
        <section class="surface-card meal-hero">
          <div class="meal-hero__top">
            <span class="meal-hero__type">{{ mealLabels[meal.type] }}</span>
            <span class="meal-hero__time">{{ dayjs(meal.recordedAt).format('HH:mm') }}</span>
          </div>
          <strong class="meal-hero__calories">
            {{ meal.totalCalories === null ? '—' : meal.totalCalories }} <small>kcal</small>
          </strong>
          <span class="meal-hero__hint">
            {{ meal.totalCalories === null ? '这一餐没有记录热量' : '按已记录食物合计' }}
          </span>
        </section>

        <img v-if="meal.imageUrl" class="meal-photo" :src="meal.imageUrl" alt="餐食照片" />

        <section class="section">
          <div class="section-heading">
            <h2>食物明细</h2>
            <span>
              {{ meal.foods.length }} 项<template v-if="aiCount">
                · {{ aiCount }} 项来自识别</template
              >
            </span>
          </div>
          <div class="food-table">
            <div v-for="food in meal.foods" :key="food.id" class="food-row">
              <div class="food-row__main">
                <strong>{{ food.name }}</strong>
                <small v-if="food.aiGenerated">AI 识别</small>
              </div>
              <span>{{ food.amount || '份量未记' }}</span>
              <span>{{ food.calories === null ? '—' : `${food.calories} kcal` }}</span>
            </div>
          </div>
        </section>

        <section class="section">
          <div class="section-heading"><h2>备注</h2></div>
          <p class="note-text">{{ meal.note || '无' }}</p>
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
.meal-hero {
  display: grid;
  gap: 6px;
  padding: 18px;

  &__top {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__type {
    padding: 3px 8px;
    font-size: 0.75rem;
    font-weight: 500;
    background: var(--color-primary-light);
    border-radius: 6px;
  }

  &__time {
    color: var(--color-text-tertiary);
    font-size: 0.875rem;
  }

  &__calories {
    font-size: 2.1rem;
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.05em;

    small {
      font-size: 0.875rem;
      font-weight: 500;
    }
  }

  &__hint {
    color: var(--color-text-tertiary);
    font-size: 0.75rem;
  }
}

.meal-photo {
  width: 100%;
  max-height: 260px;
  margin-top: 12px;
  object-fit: cover;
  background: var(--color-surface-muted);
  border-radius: var(--border-radius-md);
}

.section {
  margin-top: 20px;
}

.section-heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;

  h2 {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
  }

  span {
    color: var(--color-text-tertiary);
    font-size: 0.75rem;
  }
}

.food-table {
  overflow: hidden;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius-md);
}

.food-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 13px 14px;
  color: var(--color-text-secondary);
  font-size: 0.875rem;

  + .food-row {
    border-top: 1px solid var(--color-border);
  }

  &__main {
    display: flex;
    min-width: 0;
    flex: 1;
    align-items: center;
    gap: 7px;

    strong {
      overflow: hidden;
      color: var(--color-text-primary);
      font-size: 0.9375rem;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    small {
      flex: none;
      padding: 2px 5px;
      color: var(--color-text-secondary);
      font-size: 0.75rem;
      font-weight: 500;
      background: var(--color-surface-muted);
      border-radius: 4px;
    }
  }
}

.note-text {
  margin: 0;
  padding: 14px;
  color: var(--color-text-secondary);
  font-size: 0.875rem;
  line-height: 1.7;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius-md);
}

.detail-actions {
  margin-top: 18px;
}
</style>
