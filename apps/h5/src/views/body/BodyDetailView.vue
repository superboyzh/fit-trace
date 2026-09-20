<script setup lang="ts">
import type { ApiErrorResponse, BodyRecord } from '@fit-trace/shared';
import axios from 'axios';
import dayjs from 'dayjs';
import { Button, DialogPlugin, Loading, ToastPlugin } from 'tdesign-mobile-vue';
import { DeleteIcon } from 'tdesign-icons-vue-next';
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { deleteBodyRecord, getBodyRecord } from '@/api/body-records';
import RecordDetailHeader from '@/components/RecordDetailHeader.vue';

const route = useRoute();
const router = useRouter();
const recordId = computed(() => (typeof route.params.id === 'string' ? route.params.id : ''));
const loading = ref(true);
const record = ref<BodyRecord | null>(null);
const recordedAtText = computed(() =>
  record.value ? dayjs(record.value.recordedAt).format('YYYY年M月D日 HH:mm') : '',
);
const metrics = computed(() => [
  { label: '体脂率', value: record.value?.bodyFat, unit: '%' },
  { label: '腰围', value: record.value?.waist, unit: 'cm' },
  { label: '胸围', value: record.value?.chest, unit: 'cm' },
  { label: '臀围', value: record.value?.hip, unit: 'cm' },
]);

function confirmDelete(): void {
  const target = record.value;
  if (!target) return;
  let deleting = false;
  const dialog = DialogPlugin.confirm({
    title: '删除这条记录？',
    content: `${dayjs(target.recordedAt).format('YYYY年M月D日')} · ${target.weight} kg，删除后无法恢复。`,
    confirmBtn: { content: '删除', theme: 'danger' },
    cancelBtn: '取消',
    onConfirm: async () => {
      if (deleting) return;
      deleting = true;
      dialog.update({ confirmBtn: { content: '删除中…', theme: 'danger', loading: true } });
      try {
        await deleteBodyRecord(target.id);
        ToastPlugin.success('记录已删除');
        dialog.destroy();
        await router.replace('/body/history');
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
    record.value = await getBodyRecord(recordId.value);
  } catch {
    ToastPlugin.error('记录不存在或已被删除');
    await router.replace('/body/history');
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <main class="view-page detail-page">
    <RecordDetailHeader
      title="身体数据"
      :subtitle="recordedAtText"
      action-label="编辑"
      @action="router.push(`/body/${recordId}/edit`)"
    />

    <Loading class="page-loading" :loading="loading" text="正在读取记录">
      <template v-if="record">
        <section class="surface-card weight-card">
          <span>体重</span>
          <strong>{{ record.weight }} <small>kg</small></strong>
        </section>

        <section class="metric-grid">
          <div v-for="item in metrics" :key="item.label">
            <span>{{ item.label }}</span>
            <strong v-if="item.value !== null && item.value !== undefined">
              {{ item.value }} <small>{{ item.unit }}</small>
            </strong>
            <strong v-else class="empty">未记录</strong>
          </div>
        </section>

        <section class="surface-card info-card">
          <div>
            <span>记录时间</span>
            <strong>{{ recordedAtText }}</strong>
          </div>
          <div>
            <span>备注</span>
            <strong>{{ record.note || '无' }}</strong>
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
.weight-card {
  display: grid;
  gap: 4px;
  padding: 20px;

  span {
    color: var(--color-text-tertiary);
    font-size: 0.75rem;
  }

  strong {
    font-size: 2.4rem;
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.05em;

    small {
      font-size: 0.9375rem;
      font-weight: 500;
    }
  }
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1px;
  overflow: hidden;
  margin-top: 12px;
  background: var(--color-border);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius-md);

  > div {
    display: grid;
    gap: 5px;
    padding: 14px;
    background: var(--color-surface);
  }

  span {
    color: var(--color-text-tertiary);
    font-size: 0.75rem;
  }

  strong {
    font-size: 1rem;
    font-variant-numeric: tabular-nums;

    small {
      font-size: 0.75rem;
      font-weight: 500;
    }

    &.empty {
      color: var(--color-text-tertiary);
      font-size: 0.875rem;
      font-weight: 500;
    }
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
    font-size: 0.75rem;
  }

  strong {
    font-size: 0.9375rem;
    font-weight: 600;
    line-height: 1.6;
  }
}

.detail-actions {
  margin-top: 18px;
}
</style>
