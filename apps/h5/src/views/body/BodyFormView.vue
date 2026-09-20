<script setup lang="ts">
import axios from 'axios';
import dayjs from 'dayjs';
import {
  Button,
  DateTimePicker,
  Form,
  FormItem,
  Input,
  Loading,
  Popup,
  Textarea,
  ToastPlugin,
  type FormRules,
  type SubmitContext,
} from 'tdesign-mobile-vue';
import { CalendarIcon, ChevronLeftIcon } from 'tdesign-icons-vue-next';
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { ApiErrorResponse } from '@fit-trace/shared';
import {
  createBodyRecord,
  getBodyRecord,
  updateBodyRecord,
  type BodyRecordInput,
} from '@/api/body-records';

interface BodyFormData {
  weight?: number | string;
  bodyFat?: number | string;
  waist?: number | string;
  chest?: number | string;
  hip?: number | string;
  recordedAt: string;
  note: string;
}

const route = useRoute();
const router = useRouter();
const recordId = computed(() => (typeof route.params.id === 'string' ? route.params.id : null));
const isEdit = computed(() => Boolean(recordId.value));
const loading = ref(Boolean(recordId.value));
const submitting = ref(false);
const datePickerVisible = ref(false);
const formData = reactive<BodyFormData>({
  weight: undefined,
  bodyFat: undefined,
  waist: undefined,
  chest: undefined,
  hip: undefined,
  recordedAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
  note: '',
});

const rules: FormRules<BodyFormData> = {
  weight: [
    { required: true, message: '请输入体重' },
    { min: 1, message: '体重必须大于 0' },
  ],
  recordedAt: [{ required: true, message: '请选择记录时间' }],
};

onMounted(async () => {
  if (!recordId.value) return;
  try {
    const record = await getBodyRecord(recordId.value);
    Object.assign(formData, {
      weight: record.weight,
      bodyFat: record.bodyFat ?? undefined,
      waist: record.waist ?? undefined,
      chest: record.chest ?? undefined,
      hip: record.hip ?? undefined,
      recordedAt: dayjs(record.recordedAt).format('YYYY-MM-DD HH:mm:ss'),
      note: record.note ?? '',
    });
  } catch {
    await router.replace('/body/history');
  } finally {
    loading.value = false;
  }
});

const recordedAtDisplay = computed(() =>
  formData.recordedAt ? dayjs(formData.recordedAt).format('YYYY-MM-DD HH:mm') : '',
);

function optionalNumber(value: number | string | undefined): number | undefined {
  if (value === undefined || value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function confirmRecordedAt(value: string | number): void {
  formData.recordedAt = dayjs(value).format('YYYY-MM-DD HH:mm:ss');
  datePickerVisible.value = false;
}

async function submit(context: SubmitContext): Promise<void> {
  const weight = optionalNumber(formData.weight);
  if (context.validateResult !== true || submitting.value || weight === undefined) return;
  submitting.value = true;
  const input: BodyRecordInput = {
    weight,
    bodyFat: optionalNumber(formData.bodyFat),
    waist: optionalNumber(formData.waist),
    chest: optionalNumber(formData.chest),
    hip: optionalNumber(formData.hip),
    recordedAt: dayjs(formData.recordedAt).toISOString(),
    note: formData.note.trim() || undefined,
  };

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
</script>

<template>
  <main class="view-page body-form-page">
    <header class="form-header">
      <Button variant="text" shape="round" @click="router.back()">
        <ChevronLeftIcon /> 返回
      </Button>
      <div>
        <span class="page-header__eyebrow">Body Record</span>
        <h1>{{ isEdit ? '编辑身体数据' : '记录身体数据' }}</h1>
        <p>体重是必填项，其他指标可以稍后补充。</p>
      </div>
    </header>

    <Loading class="page-loading" :loading="loading" text="正在读取记录">
      <section class="surface-card form-card">
        <Form :data="formData" :rules="rules" label-align="top" @submit="submit">
          <FormItem class="weight-item" label="今日体重" name="weight">
            <div class="weight-control">
              <Input
                v-model="formData.weight"
                class="metric-input"
                align="left"
                type="number"
                inputmode="decimal"
                suffix="kg"
                placeholder="70.5"
              />
              <span>建议在相同时段、相同状态下记录</span>
            </div>
          </FormItem>

          <div class="metric-grid">
            <FormItem label="体脂率" name="bodyFat">
              <Input
                v-model="formData.bodyFat"
                type="number"
                inputmode="decimal"
                suffix="%"
                placeholder="可选"
              />
            </FormItem>
            <FormItem label="腰围" name="waist">
              <Input
                v-model="formData.waist"
                type="number"
                inputmode="decimal"
                suffix="cm"
                placeholder="可选"
              />
            </FormItem>
            <FormItem label="胸围" name="chest">
              <Input
                v-model="formData.chest"
                type="number"
                inputmode="decimal"
                suffix="cm"
                placeholder="可选"
              />
            </FormItem>
            <FormItem label="臀围" name="hip">
              <Input
                v-model="formData.hip"
                type="number"
                inputmode="decimal"
                suffix="cm"
                placeholder="可选"
              />
            </FormItem>
          </div>

          <FormItem label="记录时间" name="recordedAt">
            <Input
              :model-value="recordedAtDisplay"
              class="full-width-control"
              readonly
              placeholder="选择记录时间"
              @click="datePickerVisible = true"
            >
              <template #suffix-icon><CalendarIcon /></template>
            </Input>
          </FormItem>

          <FormItem label="备注" name="note">
            <Textarea
              v-model="formData.note"
              :maxlength="500"
              :autosize="{ minRows: 3, maxRows: 6 }"
              placeholder="例如：晨起空腹、训练后等"
            />
          </FormItem>

          <Button type="submit" theme="primary" block size="large" :loading="submitting">
            {{ isEdit ? '保存修改' : '保存记录' }}
          </Button>
        </Form>
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
.form-header {
  padding: 18px 0 20px;

  > .t-button {
    margin: 0 0 13px -10px;
  }

  h1 {
    margin: 5px 0;
    font-size: 1.7rem;
    font-weight: 850;
    letter-spacing: -0.04em;
  }

  p {
    margin: 0;
    color: var(--color-text-secondary);
    font-size: 0.82rem;
  }
}

.form-card {
  padding: 20px;
}

.weight-item {
  margin: -20px -20px 22px;
  padding: 22px 20px 20px;
  background: radial-gradient(circle at 94% 0, rgb(184 242 61 / 48%), transparent 34%), #eff5e8;
  border-bottom: 1px solid #dfe8d4;

  :deep(.t-form__label) {
    color: var(--color-text-secondary);
    font-size: 0.72rem;
    letter-spacing: 0.04em;
  }

  :deep(.t-input) {
    height: 64px;
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
    font-size: 3rem;
    font-weight: 900;
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.06em;

    &::placeholder {
      color: rgb(17 23 21 / 20%);
    }
  }

  :deep(.t-input__wrap--suffix) {
    align-self: flex-end;
    margin-bottom: 11px;
    color: var(--color-ink);
    font-size: 0.82rem;
    font-weight: 850;
  }
}

.weight-control {
  width: 100%;

  > span {
    display: block;
    margin-top: 2px;
    color: var(--color-text-tertiary);
    font-size: 0.65rem;
  }
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  column-gap: 12px;
}

.metric-input,
.full-width-control,
:deep(.t-input) {
  width: 100%;
}

:deep(.t-form__item) {
  margin-bottom: 18px;
}

:deep(.t-form__label) {
  color: var(--color-text-secondary);
  font-size: 0.72rem;
  font-weight: 700;
}

@media (max-width: 380px) {
  .metric-grid {
    grid-template-columns: 1fr;
  }
}
</style>
