<script setup lang="ts">
import axios from 'axios';
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { Button, ToastPlugin } from 'tdesign-mobile-vue';
import RecordDetailHeader from '@/components/RecordDetailHeader.vue';
import { changePassword } from '@/api/auth';
import { authSession } from '@/api/session';
import { useAuthStore } from '@/stores/auth';
import { showRequestError } from '@/utils/request-error';

const router = useRouter();
const auth = useAuthStore();
const currentPassword = ref('');
const password = ref('');
const confirmPassword = ref('');
const visible = ref(false);
const saving = ref(false);
const errors = reactive({ currentPassword: '', password: '', confirmPassword: '' });

async function save(): Promise<void> {
  if (saving.value) return;
  errors.currentPassword =
    currentPassword.value.length < 8 || currentPassword.value.length > 72
      ? '请输入 8 到 72 位当前密码'
      : '';
  errors.password =
    password.value.length < 8 || password.value.length > 72
      ? '新密码长度必须为 8 到 72 位'
      : password.value === currentPassword.value
        ? '新密码不能与当前密码相同'
        : '';
  errors.confirmPassword = confirmPassword.value !== password.value ? '两次输入的新密码不一致' : '';
  if (Object.values(errors).some(Boolean)) return;
  saving.value = true;
  const generation = authSession.generation;
  try {
    await changePassword({ currentPassword: currentPassword.value, password: password.value });
    if (generation !== authSession.generation) return;
    auth.logout();
    ToastPlugin.success('密码已修改，请重新登录');
    await router.replace('/login');
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.data?.code === 'CURRENT_PASSWORD_INCORRECT')
      errors.currentPassword = '当前密码不正确';
    showRequestError(error, '修改失败，请稍后重试');
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <main class="view-page password-settings-page">
    <RecordDetailHeader title="修改密码" />
    <form class="settings-form" novalidate @submit.prevent="save">
      <div class="settings-list">
        <div class="form-field">
          <label for="current-password" class="form-label">当前密码</label>
          <input
            id="current-password"
            v-model="currentPassword"
            class="field-input"
            :type="visible ? 'text' : 'password'"
            autocomplete="current-password"
            placeholder="输入当前密码"
            :readonly="saving"
            :aria-invalid="Boolean(errors.currentPassword)"
            aria-describedby="current-password-error"
            @input="errors.currentPassword = ''"
          />
          <small
            v-if="errors.currentPassword"
            id="current-password-error"
            class="field-error"
            role="alert"
            >{{ errors.currentPassword }}</small
          >
        </div>
        <div class="form-field">
          <label for="new-password" class="form-label">新密码</label>
          <input
            id="new-password"
            v-model="password"
            class="field-input"
            :type="visible ? 'text' : 'password'"
            autocomplete="new-password"
            placeholder="设置 8 到 72 位新密码"
            :readonly="saving"
            :aria-invalid="Boolean(errors.password)"
            aria-describedby="new-password-error"
            @input="errors.password = ''"
          />
          <small v-if="errors.password" id="new-password-error" class="field-error" role="alert">{{
            errors.password
          }}</small>
        </div>
        <div class="form-field">
          <label for="confirm-password" class="form-label">确认新密码</label>
          <input
            id="confirm-password"
            v-model="confirmPassword"
            class="field-input"
            :type="visible ? 'text' : 'password'"
            autocomplete="new-password"
            placeholder="再次输入新密码"
            :readonly="saving"
            :aria-invalid="Boolean(errors.confirmPassword)"
            aria-describedby="confirm-password-error"
            @input="errors.confirmPassword = ''"
          />
          <small
            v-if="errors.confirmPassword"
            id="confirm-password-error"
            class="field-error"
            role="alert"
            >{{ errors.confirmPassword }}</small
          >
        </div>
      </div>
      <div class="password-note">
        <label><input v-model="visible" type="checkbox" />显示密码</label>
        <p class="settings-hint">修改成功后需要重新登录，其他设备的登录也会失效</p>
      </div>
      <Button theme="primary" type="submit" size="large" block :loading="saving" :disabled="saving"
        >确认修改</Button
      >
    </form>
  </main>
</template>

<style scoped lang="scss">
@use '@/styles/settings';
.password-note {
  label {
    display: inline-flex;
    min-height: 36px;
    align-items: center;
    gap: 8px;
    color: var(--color-text-secondary);
    font-size: 0.8125rem;
  }
  input {
    accent-color: var(--color-accent-text);
  }
  .settings-hint {
    margin-top: 4px;
  }
}
</style>
