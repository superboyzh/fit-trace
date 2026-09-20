<script setup lang="ts">
import type { ApiErrorResponse, BodyRecord } from '@fit-trace/shared';
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
import { CalendarIcon, ChevronLeftIcon } from 'tdesign-icons-vue-next';
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  createBodyRecord,
  getBodyRecord,
  getLatestBodyRecord,
  updateBodyRecord,
  type BodyRecordInput,
} from '@/api/body-records';

const route = useRoute();
const router = useRouter();
const recordId = computed(() => (typeof route.params.id === 'string' ? route.params.id : null));
const isEdit = computed(() => Boolean(recordId.value));
const loading = ref(Boolean(recordId.value));
const submitting = ref(false);
const datePickerVisible = ref(false);
const previousRecord = ref<BodyRecord | null>(null);
const formData = reactive({
  weight: '' as number | string,
  bodyFat: '' as number | string,
  waist: '' as number | string,
  chest: '' as number | string,
  hip: '' as number | string,
  recordedAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
  note: '',
});
const recordedAtDisplay = computed(() => dayjs(formData.recordedAt).format('YYYY-MM-DD HH:mm'));
const previousHint = computed(() => {
  const record = previousRecord.value;
  if (!record) return '还没有历史记录，这是第一条。';
  const days = dayjs().startOf('day').diff(dayjs(record.recordedAt).startOf('day'), 'day');
  const when = days <= 0 ? '今天' : days === 1 ? '昨天' : `${days} 天前`;
  const diff = Number(formData.weight) - record.weight;
  const base = `上次 ${record.weight} kg · ${when}`;
  if (formData.weight === '' || !Number.isFinite(Number(formData.weight))) return base;
  const change = diff === 0 ? '与上次持平' : `较上次 ${diff > 0 ? '+' : ''}${diff.toFixed(1)} kg`;
  return `${base} · ${change}`;
});

function optionalNumber(value: number | string): number | undefined {
  if (value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function confirmRecordedAt(value: string | number): void {
  formData.recordedAt = dayjs(value).format('YYYY-MM-DD HH:mm:ss');
  datePickerVisible.value = false;
}

async function submit(): Promise<void> {
  if (submitting.value) return;
  const weight = optionalNumber(formData.weight);
  if (weight === undefined || weight <= 0) {
    ToastPlugin.warning('请输入正确的体重');
    return;
  }
  const bodyFat = optionalNumber(formData.bodyFat);
  if (bodyFat !== undefined && (bodyFat < 0 || bodyFat > 100)) {
    ToastPlugin.warning('体脂率需要在 0 到 100 之间');
    return;
  }

  const input: BodyRecordInput = {
    weight,
    bodyFat,
    waist: optionalNumber(formData.waist),
    chest: optionalNumber(formData.chest),
    hip: optionalNumber(formData.hip),
    recordedAt: dayjs(formData.recordedAt).toISOString(),
    note: formData.note.trim() || undefined,
  };

  submitting.value = true;
  try {
    if (recordId.value) {
      await updateBodyRecord(recordId.value, input);
      ToastPlugin.success('身体数据已更新');
    } else {
      await createBodyRecord(input);
      ToastPlugin.success('身体数据已保存');
    }
    await router.replace('/body/history');
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
  if (!recordId.value) {
    try {
      previousRecord.value = await getLatestBodyRecord();
    } catch {
      previousRecord.value = null;
    }
    return;
  }

  try {
    const record = await getBodyRecord(recordId.value);
    Object.assign(formData, {
      weight: record.weight,
      bodyFat: record.bodyFat ?? '',
      waist: record.waist ?? '',
      chest: record.chest ?? '',
      hip: record.hip ?? '',
      recordedAt: dayjs(record.recordedAt).format('YYYY-MM-DD HH:mm:ss'),
      note: record.note ?? '',
    });
  } catch {
    await router.replace('/body/history');
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <main class="view-page body-form-page">
    <header class="body-form-header">
      <Button variant="text" shape="round" @click="router.back()">
        <ChevronLeftIcon /> 返回
      </Button>
      <h1>{{ isEdit ? '编辑身体数据' : '记录身体数据' }}</h1>
      <p>体重是必填项，其他指标可以稍后补充。</p>
    </header>

    <Loading class="page-loading" :loading="loading" text="正在读取记录">
      <section class="surface-card body-form-card">
        <div class="field-block">
          <span class="field-label">今日体重</span>
          <div class="weight-field">
            <Input
              v-model="formData.weight"
              class="weight-input"
              type="number"
              inputmode="decimal"
              suffix="kg"
              placeholder="70.5"
            />
          </div>
          <small v-if="!isEdit" class="field-hint">{{ previousHint }}</small>
        </div>

        <div class="field-block">
          <span class="field-label">身体围度（可选）</span>
          <div class="metric-grid">
            <Input v-model="formData.bodyFat" type="number" suffix="%" placeholder="体脂率" />
            <Input v-model="formData.waist" type="number" suffix="cm" placeholder="腰围" />
            <Input v-model="formData.chest" type="number" suffix="cm" placeholder="胸围" />
            <Input v-model="formData.hip" type="number" suffix="cm" placeholder="臀围" />
          </div>
        </div>

        <div class="field-block">
          <span class="field-label">记录时间</span>
          <Input :model-value="recordedAtDisplay" readonly @click="datePickerVisible = true">
            <template #suffix-icon><CalendarIcon /></template>
          </Input>
        </div>

        <div class="field-block note-field">
          <span class="field-label">备注</span>
          <Textarea
            v-model="formData.note"
            :maxlength="500"
            :autosize="{ minRows: 3, maxRows: 6 }"
            placeholder="例如：晨起空腹、训练后等"
          />
        </div>

        <Button theme="primary" size="large" block :loading="submitting" @click="submit">
          {{ isEdit ? '保存修改' : '保存记录' }}
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
.body-form-header {
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

.body-form-card {
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

.field-hint {
  color: var(--color-text-tertiary);
  font-size: 0.66rem;
}

.weight-field {
  padding: 14px 14px 10px;
  background: var(--color-surface-muted);
  border-radius: var(--border-radius-md);

  :deep(.t-input) {
    height: auto;
    padding: 0;
    background: transparent;
    border: 0;
    box-shadow: none;

    &:hover,
    &:focus-within {
      border: 0;
      box-shadow: none;
    }
  }

  :deep(input) {
    color: var(--color-ink);
    font-size: 2.4rem;
    font-weight: 850;
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.05em;

    &::placeholder {
      color: rgb(17 23 21 / 18%);
    }
  }

  :deep(.t-input__wrap--suffix) {
    align-self: flex-end;
    margin-bottom: 8px;
    color: var(--color-text-secondary);
    font-size: 0.76rem;
    font-weight: 750;
  }
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;

  :deep(.t-input) {
    width: 100%;
  }
}

.note-field {
  margin-bottom: 22px;
}

@media (max-width: 360px) {
  .metric-grid {
    grid-template-columns: 1fr;
  }
}
</style>
