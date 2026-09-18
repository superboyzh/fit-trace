<script setup lang="ts">
import type { BodyRecord } from '@fit-trace/shared';
import axios from 'axios';
import dayjs from 'dayjs';
import { Button, Card, DialogPlugin, Empty, Loading, MessagePlugin, Tag } from 'tdesign-vue-next';
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
  const result = await getBodyRecords({ page: page.value, pageSize });
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
    MessagePlugin.error('加载更多记录失败');
  } finally {
    loadingMore.value = false;
  }
}

function confirmDelete(record: BodyRecord): void {
  const dialog = DialogPlugin.confirm({
    header: '删除这条记录？',
    body: `${dayjs(record.recordedAt).format('YYYY年M月D日')} · ${record.weight} kg，删除后无法恢复。`,
    theme: 'danger',
    confirmBtn: { content: '删除', theme: 'danger' },
    cancelBtn: '取消',
    width: 'min(90vw, 420px)',
    onConfirm: async () => {
      dialog.setConfirmLoading(true);
      try {
        await deleteBodyRecord(record.id);
        records.value = records.value.filter((item) => item.id !== record.id);
        total.value -= 1;
        MessagePlugin.success('记录已删除');
        dialog.destroy();
      } catch (error) {
        const message = axios.isAxiosError<ApiErrorResponse>(error)
          ? error.response?.data.message
          : undefined;
        MessagePlugin.error(message ?? '删除失败，请稍后重试');
        dialog.setConfirmLoading(false);
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
        <span class="page-header__eyebrow">BODY HISTORY</span>
        <h1>身体数据</h1>
        <p>每一次记录，都会让变化更清晰。</p>
      </div>
      <Button theme="primary" shape="round" @click="router.push('/body/create')">+ 新记录</Button>
    </header>

    <Loading :loading="loading" text="正在读取历史记录">
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
        <Card
          v-for="record in records"
          :key="record.id"
          class="surface-card record-card"
          :bordered="false"
        >
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
            <Button size="small" variant="text" @click="router.push(`/body/${record.id}/edit`)"
              >编辑</Button
            >
            <Button size="small" variant="text" theme="danger" @click="confirmDelete(record)"
              >删除</Button
            >
          </div>
        </Card>
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

.empty-state {
  padding: 52px 18px;
  background: var(--color-surface);
  border-radius: var(--border-radius-md);
}

.record-list {
  display: grid;
  gap: 12px;
}

.record-card {
  :deep(.t-card__body) {
    padding: 17px;
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
      color: var(--color-primary);
      font-size: 1.65rem;

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
    background: var(--color-background);
    border-radius: 11px;

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
