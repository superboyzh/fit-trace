<script setup lang="ts">
import type { BodyRecord } from '@fit-trace/shared';
import dayjs from 'dayjs';
import { Button, Skeleton } from 'tdesign-mobile-vue';
import {
  ActivityIcon,
  CameraIcon,
  CheckIcon,
  ChevronRightIcon,
  CloseIcon,
  DesktopIcon,
  FlagIcon,
  ForkIcon,
  LogoutIcon,
  MeasurementIcon,
  ModeDarkIcon,
  ModeLightIcon,
  PaletteIcon,
} from 'tdesign-icons-vue-next';
import { computed, nextTick, onActivated, onDeactivated, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { getBodyRecords } from '@/api/body-records';
import { getMeals } from '@/api/meals';
import { getProgressPhotos } from '@/api/progress-photos';
import { getWorkouts } from '@/api/workouts';
import { useAuthStore } from '@/stores/auth';
import {
  getAccent,
  getThemeMode,
  setAccent,
  setThemeMode,
  type AccentId,
  type ThemeMode,
} from '@/utils/theme';

defineOptions({ name: 'ProfileView' });

const auth = useAuthStore();
const router = useRouter();
const loading = ref(true);
const summaryError = ref(false);
const counts = ref<{ body: number; meal: number; workout: number; photo: number } | null>(null);
const latestBody = ref<BodyRecord | null>(null);
const displayName = computed(
  () => auth.user?.nickname || auth.user?.email?.split('@')[0] || 'FitTrace 用户',
);
const stats = computed(() => [
  { label: '身体', value: counts.value?.body, icon: MeasurementIcon, path: '/body/history' },
  { label: '饮食', value: counts.value?.meal, icon: ForkIcon, path: '/meals' },
  { label: '训练', value: counts.value?.workout, icon: ActivityIcon, path: '/workouts' },
  { label: '照片', value: counts.value?.photo, icon: CameraIcon, path: '/photos' },
]);
const totalRecords = computed(() =>
  counts.value
    ? counts.value.body + counts.value.meal + counts.value.workout + counts.value.photo
    : null,
);
const goalLabels = { LOSE_FAT: '减脂', GAIN_MUSCLE: '增肌', MAINTAIN: '保持' } as const;
const themeMode = ref<ThemeMode>(getThemeMode());
const themeOptions = [
  { value: 'system' as const, label: '跟随系统', icon: DesktopIcon },
  { value: 'light' as const, label: '浅色', icon: ModeLightIcon },
  { value: 'dark' as const, label: '深色', icon: ModeDarkIcon },
];
const accentMode = ref<AccentId>(getAccent());
const accentOptions: Array<{ value: AccentId; label: string; color: string }> = [
  { value: 'lime', label: '酸绿', color: '#a8dd35' },
  { value: 'pine', label: '松针绿', color: '#2f7d5b' },
  { value: 'teal', label: '青绿', color: '#0b7a73' },
  { value: 'indigo', label: '靛蓝', color: '#2a5fe0' },
  { value: 'amber', label: '暖橙', color: '#ff9f43' },
];
const selectedTheme = computed(() => themeOptions.find((item) => item.value === themeMode.value)!);
const selectedAccent = computed(() =>
  accentOptions.find((item) => item.value === accentMode.value)!,
);
const settingsDialog = ref<HTMLDialogElement | null>(null);
const activeSetting = ref<'theme' | 'accent' | null>(null);

async function openSetting(setting: 'theme' | 'accent'): Promise<void> {
  activeSetting.value = setting;
  await nextTick();
  settingsDialog.value?.showModal();
}

function closeSetting(): void {
  settingsDialog.value?.close();
  activeSetting.value = null;
}

function closeOnBackdrop(event: MouseEvent): void {
  const dialog = settingsDialog.value;
  if (!dialog || event.target !== dialog) return;
  const rect = dialog.getBoundingClientRect();
  if (
    event.clientX < rect.left ||
    event.clientX > rect.right ||
    event.clientY < rect.top ||
    event.clientY > rect.bottom
  )
    closeSetting();
}

function selectTheme(mode: ThemeMode): void {
  themeMode.value = mode;
  setThemeMode(mode);
}

function selectAccent(accent: AccentId): void {
  accentMode.value = accent;
  setAccent(accent);
}

async function logout(): Promise<void> {
  auth.logout();
  await router.replace('/login');
}

async function loadSummary(silent = false): Promise<void> {
  if (!silent) loading.value = true;
  try {
    const [body, meals, workouts, photos] = await Promise.all([
      getBodyRecords({ page: 1, pageSize: 1, recordedAtOrder: 'desc' }),
      getMeals({ page: 1, pageSize: 1 }),
      getWorkouts({ page: 1, pageSize: 1 }),
      getProgressPhotos({ page: 1, pageSize: 1 }),
    ]);
    counts.value = {
      body: body.meta.total,
      meal: meals.meta.total,
      workout: workouts.meta.total,
      photo: photos.meta.total,
    };
    latestBody.value = body.data[0] ?? null;
    summaryError.value = false;
  } catch {
    summaryError.value = true;
  } finally {
    if (!silent) loading.value = false;
  }
}

onMounted(() => void loadSummary());
let activated = false;
onActivated(() => {
  if (!activated) {
    activated = true;
    return;
  }
  void loadSummary(true);
});
onDeactivated(closeSetting);
</script>

<template>
  <main class="view-page profile-page">
    <header class="profile-header"><h1>我的</h1></header>

    <section class="account" aria-label="账户信息">
      <div class="avatar" aria-hidden="true">{{ displayName.slice(0, 1).toUpperCase() }}</div>
      <div class="account__body">
        <h2>{{ displayName }}</h2>
        <p>{{ auth.user?.email }}</p>
        <span v-if="auth.user?.createdAt" class="account__joined"
          >{{ dayjs(auth.user.createdAt).format('YYYY年M月D日') }} 加入</span
        >
      </div>
    </section>

    <section class="profile-section" aria-labelledby="records-title">
      <div class="section-heading">
        <h2 id="records-title">我的记录</h2>
        <span v-if="totalRecords !== null">共 {{ totalRecords }} 条</span>
      </div>
      <div class="profile-card record-grid" :aria-busy="loading">
        <button
          v-for="item in stats"
          :key="item.path"
          type="button"
          :aria-label="`查看${item.label}记录`"
          @click="router.push(item.path)"
        >
          <component :is="item.icon" aria-hidden="true" />
          <Skeleton v-if="loading" :loading="true" animation="gradient" :row-col="[1]" />
          <strong v-else>{{ item.value ?? '—' }}</strong>
          <span>{{ item.label }}</span>
        </button>
      </div>
      <button v-if="summaryError" class="summary-retry" type="button" @click="loadSummary()">
        记录暂时无法读取，点击重试
      </button>
    </section>

    <section class="profile-section" aria-labelledby="goal-title">
      <div class="section-heading"><h2 id="goal-title">我的目标</h2></div>
      <button class="profile-card goal-card" type="button" @click="router.push('/goal')">
        <div class="goal-card__heading">
          <span class="row-icon row-icon--accent"><FlagIcon aria-hidden="true" /></span>
          <strong>{{
            auth.user?.goal ? `${goalLabels[auth.user.goal.type]}计划` : '设置健身目标'
          }}</strong>
          <span class="goal-card__action">{{ auth.user?.goal ? '调整' : '去设置' }}</span>
          <ChevronRightIcon class="chevron" aria-hidden="true" />
        </div>
        <div class="goal-card__metrics">
          <div>
            <span>当前体重</span>
            <Skeleton v-if="loading" :loading="true" animation="gradient" :row-col="[1]" />
            <strong v-else-if="latestBody">{{ latestBody.weight }} <small>kg</small></strong>
            <strong v-else class="goal-card__empty">{{ summaryError ? '—' : '未记录' }}</strong>
          </div>
          <span class="goal-card__separator" aria-hidden="true">→</span>
          <div>
            <span>目标体重</span>
            <strong v-if="auth.user?.goal"
              >{{ auth.user.goal.targetWeight }} <small>kg</small></strong
            >
            <strong v-else class="goal-card__empty">未设置</strong>
          </div>
        </div>
        <p class="goal-card__note">
          <template v-if="auth.user?.goal">
            起始 {{ auth.user.goal.startWeight }} kg
            <template v-if="auth.user.goal.targetDate"
              ><span aria-hidden="true"> · </span>目标日期
              {{ dayjs(auth.user.goal.targetDate).format('M月D日') }}</template
            >
          </template>
          <template v-else>减脂、增肌或保持，找到适合自己的节奏</template>
        </p>
        <p v-if="latestBody" class="goal-card__updated">
          体重更新于 {{ dayjs(latestBody.recordedAt).format('M月D日') }}
        </p>
      </button>
    </section>

    <section class="profile-section" aria-labelledby="appearance-title">
      <div class="section-heading"><h2 id="appearance-title">外观设置</h2></div>
      <div class="profile-card settings-list">
        <button
          class="setting-row"
          type="button"
          aria-haspopup="dialog"
          @click="openSetting('theme')"
        >
          <span class="row-icon"><component :is="selectedTheme.icon" aria-hidden="true" /></span>
          <span class="setting-row__label">显示模式</span>
          <span class="setting-row__value">{{ selectedTheme.label }}</span>
          <ChevronRightIcon class="chevron" aria-hidden="true" />
        </button>
        <button
          class="setting-row"
          type="button"
          aria-haspopup="dialog"
          @click="openSetting('accent')"
        >
          <span class="row-icon"><PaletteIcon aria-hidden="true" /></span>
          <span class="setting-row__label">强调色</span>
          <span class="setting-row__value"
            ><i
              class="accent-dot"
              :style="{ background: selectedAccent.color }"
              aria-hidden="true"
            />{{ selectedAccent.label }}</span
          >
          <ChevronRightIcon class="chevron" aria-hidden="true" />
        </button>
      </div>
    </section>

    <button class="logout-button" type="button" @click="logout">
      <LogoutIcon aria-hidden="true" />退出登录
    </button>
    <footer class="profile-footer">FitTrace <span>v0.1.0</span></footer>

    <dialog
      ref="settingsDialog"
      class="settings-sheet"
      aria-labelledby="settings-title"
      aria-describedby="settings-description"
      @click="closeOnBackdrop"
      @cancel.prevent="closeSetting"
      @close="activeSetting = null"
    >
      <div class="settings-sheet__content">
        <header class="settings-sheet__header">
          <div>
            <h2 id="settings-title">{{ activeSetting === 'theme' ? '显示模式' : '强调色' }}</h2>
            <p id="settings-description">选择后立即生效，自动保存</p>
          </div>
          <button
            class="close-button"
            type="button"
            aria-label="关闭外观设置"
            @click="closeSetting"
          >
            <CloseIcon aria-hidden="true" />
          </button>
        </header>
        <div
          v-if="activeSetting === 'theme'"
          class="theme-options"
          role="group"
          aria-label="显示模式"
        >
          <button
            v-for="item in themeOptions"
            :key="item.value"
            type="button"
            :class="{ active: themeMode === item.value }"
            :aria-pressed="themeMode === item.value"
            @click="selectTheme(item.value)"
          >
            <span class="theme-preview" :class="`theme-preview--${item.value}`" aria-hidden="true"
              ><i /><i /><i
            /></span>
            <span>{{ item.label }}</span>
            <span class="selection-check" aria-hidden="true"
              ><CheckIcon v-if="themeMode === item.value"
            /></span>
          </button>
        </div>
        <div v-else class="accent-options" role="group" aria-label="强调色">
          <button
            v-for="item in accentOptions"
            :key="item.value"
            type="button"
            :class="{ active: accentMode === item.value }"
            :aria-pressed="accentMode === item.value"
            @click="selectAccent(item.value)"
          >
            <span class="accent-swatch" :style="{ background: item.color }" aria-hidden="true" />
            <span>{{ item.label }}</span>
            <span class="selection-check" aria-hidden="true"
              ><CheckIcon v-if="accentMode === item.value"
            /></span>
          </button>
        </div>
        <Button theme="primary" block size="large" @click="closeSetting">完成</Button>
      </div>
    </dialog>
  </main>
</template>

<style scoped lang="scss">
.profile-header {
  padding: 24px 0 18px;
  h1 {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 750;
    letter-spacing: -0.04em;
  }
}
.account {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 8px 0 6px;
  &__body {
    min-width: 0;
    h2,
    p {
      overflow: hidden;
      margin: 0;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    h2 {
      font-size: 1.375rem;
      font-weight: 750;
      line-height: 1.4;
    }
    p {
      margin-top: 3px;
      color: var(--color-text-secondary);
      font-size: 0.8125rem;
    }
  }
  &__joined {
    display: block;
    margin-top: 7px;
    color: var(--color-text-tertiary);
    font-size: 0.6875rem;
  }
}
.avatar {
  display: grid;
  width: 64px;
  height: 64px;
  flex: none;
  place-items: center;
  color: var(--color-accent-text);
  font-size: 1.75rem;
  font-weight: 650;
  background: var(--color-primary-light);
  border: 1px solid var(--color-primary-border);
  border-radius: 22px;
}
.profile-section {
  margin-top: 24px;
}
.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
  h2 {
    margin: 0;
    font-size: 0.8125rem;
    font-weight: 600;
  }
  > span {
    color: var(--color-text-tertiary);
    font-size: 0.6875rem;
  }
}
.profile-card {
  overflow: hidden;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 16px;
}
.profile-page button {
  color: var(--color-text-primary);
  cursor: pointer;
  &:focus-visible {
    outline: 2px solid var(--color-accent-text);
    outline-offset: 3px;
  }
}
.record-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  padding: 16px 0;
  button {
    display: flex;
    min-width: 0;
    flex-direction: column;
    align-items: center;
    gap: 7px;
    padding: 0 6px;
    background: transparent;
    border: 0;
    border-radius: 6px;
    + button {
      border-left: 1px solid var(--color-border);
    }
    > svg {
      color: var(--color-text-tertiary);
      font-size: 1.125rem;
    }
    strong {
      font-size: 1.375rem;
      font-weight: 700;
      line-height: 1.2;
      font-variant-numeric: tabular-nums;
      letter-spacing: -0.04em;
    }
    > span {
      color: var(--color-text-secondary);
      font-size: 0.75rem;
    }
    &:active {
      background: var(--color-surface-muted);
    }
  }
  .t-skeleton {
    width: 36px;
    height: 27px;
  }
}
.summary-retry {
  margin-top: 8px;
  padding: 4px 0;
  color: var(--color-text-secondary);
  font-size: 0.75rem;
  background: transparent;
  border: 0;
}
.row-icon {
  display: grid;
  width: 32px;
  height: 32px;
  flex: none;
  place-items: center;
  color: var(--color-text-secondary);
  font-size: 1.125rem;
  background: var(--color-surface-muted);
  border-radius: 10px;
  &--accent {
    color: var(--color-accent-text);
    background: var(--color-primary-light);
  }
}
.chevron {
  flex: none;
  color: var(--color-text-tertiary);
  font-size: 1rem;
}
.goal-card {
  display: block;
  width: 100%;
  padding: 16px;
  text-align: left;
  &__heading {
    display: flex;
    align-items: center;
    gap: 10px;
    > strong {
      flex: 1;
      font-size: 0.9375rem;
      font-weight: 650;
    }
  }
  &__action {
    color: var(--color-text-tertiary);
    font-size: 0.75rem;
  }
  &__metrics {
    display: grid;
    grid-template-columns: 1fr 24px 1fr;
    align-items: center;
    gap: 14px;
    margin-top: 20px;
    > div {
      display: grid;
      min-width: 0;
      gap: 7px;
    }
    span {
      color: var(--color-text-tertiary);
      font-size: 0.75rem;
    }
    strong {
      font-size: 1.625rem;
      font-weight: 650;
      line-height: 1.2;
      font-variant-numeric: tabular-nums;
      letter-spacing: -0.035em;
    }
    small {
      color: var(--color-text-secondary);
      font-size: 0.75rem;
      font-weight: 400;
      letter-spacing: 0;
    }
    .goal-card__empty {
      padding: 5px 0;
      color: var(--color-text-tertiary);
      font-size: 1rem;
      font-weight: 500;
    }
    .goal-card__separator {
      font-size: 1.25rem;
      text-align: center;
    }
    .t-skeleton {
      max-width: 100px;
      height: 31px;
    }
  }
  &__note,
  &__updated {
    margin: 16px 0 0;
    color: var(--color-text-secondary);
    font-size: 0.6875rem;
    line-height: 1.6;
  }
  &__note {
    padding-top: 12px;
    border-top: 1px solid var(--color-border);
  }
  &__updated {
    margin-top: 2px;
    color: var(--color-text-tertiary);
  }
  &:active {
    background: var(--color-surface-muted);
  }
}
.setting-row {
  display: flex;
  width: 100%;
  min-height: 62px;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: transparent;
  border: 0;
  text-align: left;
  + .setting-row {
    position: relative;
    &::before {
      position: absolute;
      top: 0;
      right: 16px;
      left: 58px;
      height: 1px;
      background: var(--color-border);
      content: '';
    }
  }
  &__label {
    flex: 1;
    font-size: 0.875rem;
  }
  &__value {
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--color-text-tertiary);
    font-size: 0.75rem;
  }
  &:active {
    background: var(--color-surface-muted);
  }
}
.accent-dot {
  width: 12px;
  height: 12px;
  flex: none;
  border-radius: 50%;
  box-shadow: inset 0 0 0 1px rgb(0 0 0 / 10%);
}
.logout-button {
  display: flex;
  width: 100%;
  min-height: 46px;
  align-items: center;
  justify-content: center;
  gap: 7px;
  margin-top: 22px;
  font-size: 0.8125rem;
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  > svg {
    color: var(--color-text-secondary);
    font-size: 1rem;
  }
  &:active {
    background: var(--color-surface-muted);
  }
}
.profile-footer {
  padding-top: 16px;
  color: var(--color-text-tertiary);
  font-size: 0.6875rem;
  text-align: center;
  > span {
    margin-left: 5px;
  }
}
.settings-sheet {
  position: fixed;
  inset: auto 0 0;
  width: min(100%, 560px);
  max-width: 100%;
  max-height: 85dvh;
  margin: 0 auto;
  padding: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  color: var(--color-text-primary);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-bottom: 0;
  border-radius: 22px 22px 0 0;
  &::backdrop {
    background: rgb(0 0 0 / 36%);
  }
  &__content {
    padding: 24px 20px calc(24px + var(--app-safe-area-bottom));
  }
  &__header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 24px;
    h2 {
      margin: 0;
      font-size: 1.125rem;
      font-weight: 650;
    }
    p {
      margin: 6px 0 0;
      color: var(--color-text-tertiary);
      font-size: 0.75rem;
    }
  }
  .close-button {
    display: grid;
    width: 32px;
    height: 32px;
    flex: none;
    place-items: center;
    font-size: 1.125rem;
    background: var(--color-surface-muted);
    border: 0;
    border-radius: 50%;
  }
}
.theme-options,
.accent-options {
  display: grid;
  gap: 8px;
  margin-bottom: 24px;
  > button {
    display: flex;
    min-width: 0;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    padding: 12px 6px;
    font-size: 0.75rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 12px;
    &.active {
      background: var(--color-primary-light);
      border-color: var(--color-accent-text);
    }
  }
}
.theme-options {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}
.theme-preview {
  display: grid;
  width: 52px;
  height: 64px;
  align-content: start;
  gap: 5px;
  padding: 10px 7px;
  background: #f1f3f0;
  border: 1px solid #d6dcd6;
  border-radius: 7px;
  > i {
    height: 8px;
    background: #d2d8d2;
    border-radius: 2px;
    &:first-child {
      width: 55%;
      height: 5px;
      margin-bottom: 2px;
      background: #626d65;
    }
  }
  &--dark {
    background: #222a27;
    border-color: #414d46;
    > i {
      background: #45534a;
      &:first-child {
        background: #c2cec6;
      }
    }
  }
  &--system {
    background: linear-gradient(90deg, #f1f3f0 50%, #222a27 50%);
    > i {
      background: linear-gradient(90deg, #d2d8d2 50%, #45534a 50%);
    }
  }
}
.accent-options {
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 6px;
  > button {
    gap: 10px;
    padding: 12px 2px;
    font-size: 0.6875rem;
  }
}
.accent-swatch {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  box-shadow: inset 0 0 0 1px rgb(0 0 0 / 10%);
}
.selection-check {
  display: grid;
  width: 16px;
  height: 16px;
  place-items: center;
  color: var(--color-accent-text);
  font-size: 1rem;
}
</style>
