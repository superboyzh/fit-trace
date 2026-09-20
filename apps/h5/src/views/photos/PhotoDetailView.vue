<script setup lang="ts">
import type { ApiErrorResponse, PhotoType, ProgressPhoto } from '@fit-trace/shared';
import axios from 'axios';
import dayjs from 'dayjs';
import { Button, DialogPlugin, Loading, ToastPlugin } from 'tdesign-mobile-vue';
import { DeleteIcon } from 'tdesign-icons-vue-next';
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { deleteProgressPhoto, getProgressPhoto } from '@/api/progress-photos';
import RecordDetailHeader from '@/components/RecordDetailHeader.vue';

const photoLabels: Record<PhotoType, string> = {
  FRONT: '正面',
  SIDE: '侧面',
  BACK: '背面',
  OTHER: '其他',
};

const route = useRoute();
const router = useRouter();
const photoId = computed(() => (typeof route.params.id === 'string' ? route.params.id : ''));
const loading = ref(true);
const photo = ref<ProgressPhoto | null>(null);
const recordedAtText = computed(() =>
  photo.value ? dayjs(photo.value.recordedAt).format('YYYY年M月D日') : '',
);

function confirmDelete(): void {
  const target = photo.value;
  if (!target) return;
  let deleting = false;
  const dialog = DialogPlugin.confirm({
    title: '删除这张照片？',
    content: `${recordedAtText.value} · ${photoLabels[target.type]}，删除后无法恢复。`,
    confirmBtn: { content: '删除', theme: 'danger' },
    cancelBtn: '取消',
    onConfirm: async () => {
      if (deleting) return;
      deleting = true;
      dialog.update({ confirmBtn: { content: '删除中…', theme: 'danger', loading: true } });
      try {
        await deleteProgressPhoto(target.id);
        ToastPlugin.success('照片已删除');
        dialog.destroy();
        await router.replace('/photos');
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
    photo.value = await getProgressPhoto(photoId.value);
  } catch {
    ToastPlugin.error('照片不存在或已被删除');
    await router.replace('/photos');
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <main class="view-page detail-page">
    <RecordDetailHeader
      title="身材照片"
      :subtitle="photo ? `${recordedAtText} · ${photoLabels[photo.type]}` : ''"
    />

    <Loading class="page-loading" :loading="loading" text="正在读取照片">
      <template v-if="photo">
        <img class="photo-full" :src="photo.imageUrl" :alt="`${photoLabels[photo.type]}照片`" />

        <section class="surface-card info-card">
          <div>
            <span>拍摄类型</span>
            <strong>{{ photoLabels[photo.type] }}</strong>
          </div>
          <div>
            <span>记录日期</span>
            <strong>{{ dayjs(photo.recordedAt).format('YYYY年M月D日 HH:mm') }}</strong>
          </div>
          <div>
            <span>备注</span>
            <strong>{{ photo.note || '无' }}</strong>
          </div>
        </section>

        <div class="detail-actions">
          <Button variant="text" theme="danger" block @click="confirmDelete">
            <DeleteIcon /> 删除这张照片
          </Button>
        </div>
      </template>
    </Loading>
  </main>
</template>

<style scoped lang="scss">
.photo-full {
  display: block;
  width: 100%;
  max-height: 70vh;
  object-fit: contain;
  background: var(--color-surface-muted);
  border-radius: var(--border-radius-md);
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
  }
}

.detail-actions {
  margin-top: 18px;
}
</style>
