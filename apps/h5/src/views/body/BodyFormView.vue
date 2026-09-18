<script setup lang="ts">
import axios from 'axios';
import dayjs from 'dayjs';
import {
  Button,
  Card,
  DatePicker,
  Form,
  FormItem,
  InputNumber,
  Loading,
  MessagePlugin,
  Textarea,
  type FormRules,
  type SubmitContext,
} from 'tdesign-vue-next';
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
  weight?: number;
  bodyFat?: number;
  waist?: number;
  chest?: number;
  hip?: number;
  recordedAt: string;
  note: string;
}

const route = useRoute();
const router = useRouter();
const recordId = computed(() => (typeof route.params.id === 'string' ? route.params.id : null));
const isEdit = computed(() => Boolean(recordId.value));
const loading = ref(Boolean(recordId.value));
const submitting = ref(false);
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

function optionalNumber(value: number | undefined): number | undefined {
  return typeof value === 'number' ? value : undefined;
}

async function submit(context: SubmitContext): Promise<void> {
  if (context.validateResult !== true || submitting.value || formData.weight === undefined) return;
  submitting.value = true;
  const input: BodyRecordInput = {
    weight: formData.weight,
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
      MessagePlugin.success('身体数据已更新');
    } else {
      await createBodyRecord(input);
      MessagePlugin.success('身体数据已保存');
    }
    await router.replace('/body/history');
  } catch (error) {
    const message = axios.isAxiosError<ApiErrorResponse>(error)
      ? error.response?.data.message
      : undefined;
    MessagePlugin.error(message ?? '保存失败，请稍后重试');
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <main class="view-page body-form-page">
    <header class="form-header">
      <Button variant="text" shape="round" @click="router.back()">← 返回</Button>
      <div>
        <span class="page-header__eyebrow">BODY RECORD</span>
        <h1>{{ isEdit ? '编辑身体数据' : '记录身体数据' }}</h1>
        <p>体重是必填项，其他指标可以稍后补充。</p>
      </div>
    </header>

    <Loading :loading="loading" text="正在读取记录">
      <Card class="surface-card form-card" :bordered="false">
        <Form :data="formData" :rules="rules" label-align="top" @submit="submit">
          <FormItem label="体重" name="weight">
            <InputNumber
              v-model="formData.weight"
              class="metric-input"
              :min="1"
              :max="500"
              :decimal-places="2"
              suffix="kg"
              size="large"
              placeholder="例如 70.5"
            />
          </FormItem>

          <div class="metric-grid">
            <FormItem label="体脂率" name="bodyFat">
              <InputNumber
                v-model="formData.bodyFat"
                :min="0"
                :max="100"
                :decimal-places="2"
                suffix="%"
                placeholder="可选"
              />
            </FormItem>
            <FormItem label="腰围" name="waist">
              <InputNumber
                v-model="formData.waist"
                :min="1"
                :max="500"
                :decimal-places="2"
                suffix="cm"
                placeholder="可选"
              />
            </FormItem>
            <FormItem label="胸围" name="chest">
              <InputNumber
                v-model="formData.chest"
                :min="1"
                :max="500"
                :decimal-places="2"
                suffix="cm"
                placeholder="可选"
              />
            </FormItem>
            <FormItem label="臀围" name="hip">
              <InputNumber
                v-model="formData.hip"
                :min="1"
                :max="500"
                :decimal-places="2"
                suffix="cm"
                placeholder="可选"
              />
            </FormItem>
          </div>

          <FormItem label="记录时间" name="recordedAt">
            <DatePicker
              v-model="formData.recordedAt"
              class="full-width-control"
              enable-time-picker
              format="YYYY-MM-DD HH:mm"
              value-type="YYYY-MM-DD HH:mm:ss"
              placeholder="选择记录时间"
              clearable
            />
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
      </Card>
    </Loading>
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
  }

  p {
    margin: 0;
    color: var(--color-text-secondary);
    font-size: 0.82rem;
  }
}

.form-card {
  :deep(.t-card__body) {
    padding: 20px;
  }
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  column-gap: 12px;
}

.metric-input,
.full-width-control,
:deep(.t-input-number) {
  width: 100%;
}

:deep(.t-form__item) {
  margin-bottom: 18px;
}

@media (max-width: 380px) {
  .metric-grid {
    grid-template-columns: 1fr;
  }
}
</style>
