<script setup lang="ts">
import type { BodyRecord } from '@fit-trace/shared';
import axios from 'axios';
import dayjs from 'dayjs';
import { Button, DialogPlugin, Empty, Loading, Tag, ToastPlugin } from 'tdesign-mobile-vue';
import { AddIcon, DeleteIcon, EditIcon } from 'tdesign-icons-vue-next';
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import type { ApiErrorResponse } from '@fit-trace/shared';
import { deleteBodyRecord, getBodyRecords } from '@/api/body-records';

const router = useRouter();
const records = ref<BodyRecord[]>([]);
const loading = ref(true);
const loadingMore = ref(false);
const page = ref(1);
const total = ref(0);
const pageSize = 20;

async function load(reset = false): Promise<void> {
  if (reset) {
    page.value = 1;
    records.value = [];
  }
  const result = await getBodyRecords({
    page: page.value,
    pageSize,
    recordedAtOrder: 'asc',
  });
  records.value.push(...result.data);
  total.value = result.meta.total;
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

function confirmDelete(record: BodyRecord): void {
  let deleting = false;
  const dialog = DialogPlugin.confirm({
    title: '删除这条记录？',
    content: `${dayjs(record.recordedAt).format('YYYY年M月D日')} · ${record.weight} kg，删除后无法恢复。`,
    confirmBtn: { content: '删除', theme: 'danger' },
    cancelBtn: '取消',
    onConfirm: async () => {
      if (deleting) return;
      deleting = true;
      dialog.update({ confirmBtn: { content: '删除中…', theme: 'danger', loading: true } });
      try {
        await deleteBodyRecord(record.id);
        records.value = records.value.filter((item) => item.id !== record.id);
        total.value -= 1;
        ToastPlugin.success('记录已删除');
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
  <main class="view-page history-page">
    <header class="history-header">
      <div>
        <span class="page-header__eyebrow">Body History</span>
        <h1>身体数据</h1>
        <p>每一次记录，都会让变化更清晰。</p>
      </div>
      <Button class="new-record-button" shape="round" @click="router.push('/body/create')">
        <AddIcon /> 新记录
      </Button>
    </header>

    <Loading class="page-loading" :loading="loading" text="正在读取历史记录">
      <Empty
        v-if="!loading && records.length === 0"
        class="empty-state"
        title="还没有身体数据"
        description="从今天的体重开始，建立你的第一条身体轨迹。"
      >
        <template #action>
          <Button theme="primary" @click="router.push('/body/create')">记录第一条数据</Button>
        </template>
      </Empty>

      <div v-else class="record-list">
        <section v-for="record in records" :key="record.id" class="surface-card record-card">
          <div class="record-card__heading">
            <div>
              <strong>{{ record.weight }} <small>kg</small></strong>
              <span>{{ dayjs(record.recordedAt).format('YYYY年M月D日 HH:mm') }}</span>
            </div>
            <Tag
              v-if="dayjs(record.recordedAt).isSame(dayjs(), 'day')"
              theme="success"
              variant="light"
            >
              今天
            </Tag>
          </div>

          <div class="record-card__metrics">
            <div>
              <span>体脂率</span
              ><strong>{{ record.bodyFat ?? '—' }}{{ record.bodyFat !== null ? '%' : '' }}</strong>
            </div>
            <div>
              <span>腰围</span
              ><strong>{{ record.waist ?? '—' }}{{ record.waist !== null ? ' cm' : '' }}</strong>
            </div>
            <div>
              <span>胸围</span
              ><strong>{{ record.chest ?? '—' }}{{ record.chest !== null ? ' cm' : '' }}</strong>
            </div>
            <div>
              <span>臀围</span
              ><strong>{{ record.hip ?? '—' }}{{ record.hip !== null ? ' cm' : '' }}</strong>
            </div>
          </div>

          <p v-if="record.note" class="record-card__note">{{ record.note }}</p>
          <div class="record-card__actions">
            <Button size="small" variant="text" @click="router.push(`/body/${record.id}/edit`)">
              <EditIcon /> 编辑
            </Button>
            <Button size="small" variant="text" theme="danger" @click="confirmDelete(record)"
              ><DeleteIcon /> 删除</Button
            >
          </div>
        </section>
      </div>

      <Button
        v-if="records.length < total"
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
.history-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--spacing-md);
  padding: 30px 0 22px;

  h1 {
    margin: 5px 0;
    font-size: 1.8rem;
  }

  p {
    margin: 0;
    color: var(--color-text-secondary);
    font-size: 0.8rem;
  }
}

.new-record-button.t-button {
  color: var(--color-ink);
  background: var(--color-primary);
  border-color: var(--color-primary);
}

.empty-state {
  padding: 52px 18px;
  background: var(--color-surface);
  border-radius: var(--border-radius-md);
}

.record-list {
  position: relative;
  display: grid;
  width: 100%;
  min-width: 0;
  gap: 12px;

  &::before {
    position: absolute;
    top: 18px;
    bottom: 18px;
    left: 5px;
    width: 2px;
    background: var(--color-border);
    content: '';
  }
}

.record-card {
  position: relative;
  width: auto;
  min-width: 0;
  margin-left: 17px;
  padding: 17px;

  &::before {
    position: absolute;
    top: 25px;
    left: -18px;
    width: 10px;
    height: 10px;
    background: var(--color-primary);
    border: 3px solid var(--color-background);
    border-radius: 50%;
    box-shadow: 0 0 0 2px var(--color-ink);
    content: '';
  }

  &__heading {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;

    > div {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    strong {
      color: var(--color-ink);
      font-size: 1.65rem;
      font-variant-numeric: tabular-nums;

      small {
        font-size: 0.78rem;
      }
    }

    span {
      color: var(--color-text-tertiary);
      font-size: 0.72rem;
    }
  }

  &__metrics {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 6px;
    margin-top: 17px;
    padding: 12px;
    background: var(--color-surface-muted);
    border-radius: 10px;

    div {
      display: flex;
      min-width: 0;
      flex-direction: column;
      gap: 4px;
    }

    span {
      color: var(--color-text-tertiary);
      font-size: 0.65rem;
    }

    strong {
      font-size: 0.76rem;
    }
  }

  &__note {
    margin: 12px 0 0;
    color: var(--color-text-secondary);
    font-size: 0.76rem;
    line-height: 1.6;
  }

  &__actions {
    display: flex;
    justify-content: flex-end;
    gap: 3px;
    margin: 8px -8px -8px 0;
  }
}

.load-more {
  margin-top: var(--spacing-md);
}

@media (max-width: 380px) {
  .record-card__metrics {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
