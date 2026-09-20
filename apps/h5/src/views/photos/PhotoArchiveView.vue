<script setup lang="ts">
import type { ApiErrorResponse, PhotoType, ProgressPhoto } from '@fit-trace/shared';
import axios from 'axios';
import dayjs from 'dayjs';
import { Button, DialogPlugin, Empty, Loading, ToastPlugin } from 'tdesign-mobile-vue';
import { CameraIcon, ImageIcon, UploadIcon } from 'tdesign-icons-vue-next';
import { computed, onMounted, ref } from 'vue';
import { createProgressPhoto, deleteProgressPhoto, getProgressPhotos } from '@/api/progress-photos';
import { uploadImage } from '@/api/uploads';

const photoTypes: Array<{ value: PhotoType; label: string }> = [
  { value: 'FRONT', label: '正面' },
  { value: 'SIDE', label: '侧面' },
  { value: 'BACK', label: '背面' },
  { value: 'OTHER', label: '其他' },
];
const typeLabels = Object.fromEntries(photoTypes.map((item) => [item.value, item.label])) as Record<
  PhotoType,
  string
>;

const photos = ref<ProgressPhoto[]>([]);
const loading = ref(true);
const uploading = ref(false);
const activeType = ref<PhotoType | 'ALL'>('ALL');
const uploadType = ref<PhotoType>('FRONT');
const fileInput = ref<HTMLInputElement | null>(null);

const visiblePhotos = computed(() =>
  activeType.value === 'ALL'
    ? photos.value
    : photos.value.filter((photo) => photo.type === activeType.value),
);
const groups = computed(() => {
  const result = new Map<string, ProgressPhoto[]>();
  for (const photo of visiblePhotos.value) {
    const key = dayjs(photo.recordedAt).format('YYYY年M月');
    result.set(key, [...(result.get(key) ?? []), photo]);
  }
  return [...result.entries()].map(([month, items]) => ({ month, items }));
});

async function load(): Promise<void> {
  const result = await getProgressPhotos({ page: 1, pageSize: 100 });
  photos.value = result.data;
}

function pickFile(): void {
  if (uploading.value) return;
  fileInput.value?.click();
}

async function onFileChange(event: Event): Promise<void> {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  target.value = '';
  if (!file) return;

  uploading.value = true;
  try {
    const uploaded = await uploadImage(file);
    const photo = await createProgressPhoto({
      type: uploadType.value,
      imageUrl: uploaded.url,
      recordedAt: new Date().toISOString(),
    });
    photos.value = [photo, ...photos.value];
    activeType.value = 'ALL';
    ToastPlugin.success('照片已保存');
  } catch (error) {
    ToastPlugin.error(resolveErrorMessage(error, '照片上传失败，请稍后重试'));
  } finally {
    uploading.value = false;
  }
}

function resolveErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError<ApiErrorResponse>(error)) return error.response?.data.message ?? fallback;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function confirmDelete(photo: ProgressPhoto): void {
  let deleting = false;
  const dialog = DialogPlugin.confirm({
    title: '删除这张照片？',
    content: `${dayjs(photo.recordedAt).format('YYYY年M月D日')} · ${typeLabels[photo.type]}，删除后无法恢复。`,
    confirmBtn: { content: '删除', theme: 'danger' },
    cancelBtn: '取消',
    onConfirm: async () => {
      if (deleting) return;
      deleting = true;
      dialog.update({ confirmBtn: { content: '删除中…', theme: 'danger', loading: true } });
      try {
        await deleteProgressPhoto(photo.id);
        photos.value = photos.value.filter((item) => item.id !== photo.id);
        ToastPlugin.success('照片已删除');
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
  } catch {
    ToastPlugin.error('照片加载失败');
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <main class="view-page photos-page">
    <header class="photos-header">
      <div>
        <h1>身材照片</h1>
        <p>同角度、同光线，隔一段时间再拍一张。</p>
      </div>
      <Button class="upload-button" size="small" :loading="uploading" @click="pickFile">
        <CameraIcon /> 上传
      </Button>
    </header>

    <section class="upload-panel">
      <span class="upload-panel__label">本次记录为</span>
      <div class="upload-panel__types">
        <button
          v-for="item in photoTypes"
          :key="item.value"
          type="button"
          :class="{ active: uploadType === item.value }"
          @click="uploadType = item.value"
        >
          {{ item.label }}
        </button>
      </div>
    </section>

    <div class="photo-filter" aria-label="按照片类型筛选">
      <button type="button" :class="{ active: activeType === 'ALL' }" @click="activeType = 'ALL'">
        全部
      </button>
      <button
        v-for="item in photoTypes"
        :key="item.value"
        type="button"
        :class="{ active: activeType === item.value }"
        @click="activeType = item.value"
      >
        {{ item.label }}
      </button>
    </div>

    <input
      ref="fileInput"
      class="file-input"
      type="file"
      accept="image/jpeg,image/png,image/webp"
      @change="onFileChange"
    />

    <Loading class="page-loading" :loading="loading" text="正在整理照片">
      <Empty
        v-if="!loading && visiblePhotos.length === 0"
        title="还没有照片"
        description="拍下今天的样子，之后才能看到变化。"
      >
        <template #image><ImageIcon class="empty-icon" /></template>
        <template #action>
          <Button theme="primary" @click="pickFile"><UploadIcon /> 上传第一张</Button>
        </template>
      </Empty>

      <div v-else class="photo-groups">
        <section v-for="group in groups" :key="group.month" class="photo-group">
          <header>
            <strong>{{ group.month }}</strong>
            <span>{{ group.items.length }} 张</span>
          </header>
          <div class="photo-grid">
            <button
              v-for="photo in group.items"
              :key="photo.id"
              type="button"
              class="photo-card"
              @click="confirmDelete(photo)"
            >
              <img :src="photo.imageUrl" :alt="`${typeLabels[photo.type]}记录`" loading="lazy" />
              <span class="photo-card__meta">
                <strong>{{ typeLabels[photo.type] }}</strong>
                <span>{{ dayjs(photo.recordedAt).format('M月D日') }}</span>
              </span>
              <span v-if="photo.note" class="photo-card__note">{{ photo.note }}</span>
            </button>
          </div>
        </section>
      </div>
    </Loading>
  </main>
</template>

<style scoped lang="scss">
.photos-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  padding: 24px 0 16px;

  h1 {
    margin: 0 0 4px;
    font-size: 1.55rem;
    font-weight: 800;
    letter-spacing: -0.04em;
  }

  p {
    margin: 0;
    color: var(--color-text-secondary);
    font-size: 0.76rem;
  }
}

.upload-button.t-button {
  color: var(--color-ink);
  background: var(--color-primary);
  border-color: var(--color-primary);
}

.upload-panel {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius-md);

  &__label {
    flex: none;
    color: var(--color-text-secondary);
    font-size: 0.68rem;
    font-weight: 700;
  }

  &__types {
    display: flex;
    gap: 5px;

    button {
      padding: 6px 11px;
      color: var(--color-text-secondary);
      font-size: 0.66rem;
      font-weight: 700;
      background: transparent;
      border: 1px solid var(--color-border);
      border-radius: 7px;

      &.active {
        color: var(--color-ink);
        background: var(--color-primary-light);
        border-color: #d7e9ad;
      }
    }
  }
}

.photo-filter {
  display: flex;
  gap: 6px;
  margin: 12px 0 16px;
  overflow-x: auto;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }

  button {
    min-width: 54px;
    flex: 1 0 auto;
    padding: 8px 12px;
    color: var(--color-text-secondary);
    font-size: 0.68rem;
    font-weight: 700;
    background: transparent;
    border: 1px solid var(--color-border);
    border-radius: 8px;

    &.active {
      color: var(--color-ink);
      background: var(--color-primary-light);
      border-color: #d7e9ad;
    }
  }
}

.file-input {
  display: none;
}

.photo-groups {
  display: grid;
  gap: 22px;
}

.photo-group > header {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 10px;

  strong {
    font-size: 0.9rem;
  }

  span {
    color: var(--color-text-tertiary);
    font-size: 0.64rem;
  }
}

.photo-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.photo-card {
  display: grid;
  overflow: hidden;
  padding: 0;
  text-align: left;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;

  img {
    width: 100%;
    aspect-ratio: 3 / 4;
    object-fit: cover;
    background: var(--color-surface-muted);
  }

  &__meta {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 4px;
    padding: 8px 8px 0;

    strong {
      font-size: 0.68rem;
    }

    span {
      color: var(--color-text-tertiary);
      font-size: 0.58rem;
    }
  }

  &__note {
    overflow: hidden;
    margin: 3px 0 0;
    padding: 0 8px 9px;
    color: var(--color-text-secondary);
    font-size: 0.6rem;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.empty-icon {
  color: var(--color-text-tertiary);
  font-size: 3.5rem;
}

@media (max-width: 360px) {
  .photo-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
