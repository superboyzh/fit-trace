<script setup lang="ts">
import type { BodyRecord } from '@fit-trace/shared';
import dayjs from 'dayjs';
import { Button, Skeleton, ToastPlugin } from 'tdesign-mobile-vue';
import { LogoutIcon } from 'tdesign-icons-vue-next';
import { computed, onActivated, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { getBodyRecords } from '@/api/body-records';
import { getMeals } from '@/api/meals';
import { getProgressPhotos } from '@/api/progress-photos';
import { getWorkouts } from '@/api/workouts';
import { useAuthStore } from '@/stores/auth';
import {
  applyAccent,
  applyTheme,
  getAccent,
  getThemeMode,
  setAccent,
  setThemeMode,
  type AccentId,
  type ThemeMode,
} from '@/utils/theme';

const auth = useAuthStore();
const router = useRouter();
const loading = ref(true);
const counts = ref({ body: 0, meal: 0, workout: 0, photo: 0 });
const latestBody = ref<BodyRecord | null>(null);
const displayName = computed(
  () => auth.user?.nickname || auth.user?.email?.split('@')[0] || 'FitTrace 用户',
);
const stats = computed(() => [
  { label: '身体记录', value: counts.value.body, unit: '条' },
  { label: '饮食记录', value: counts.value.meal, unit: '条' },
  { label: '训练记录', value: counts.value.workout, unit: '次' },
  { label: '身材照片', value: counts.value.photo, unit: '张' },
]);
const themeMode = ref<ThemeMode>(getThemeMode());
const themeOptions: Array<{ value: ThemeMode; label: string }> = [
  { value: 'system', label: '跟随系统' },
  { value: 'light', label: '浅色' },
  { value: 'dark', label: '深色' },
];
const accentMode = ref<AccentId>(getAccent());
const accentOptions: Array<{ value: AccentId; label: string; color: string }> = [
  { value: 'lime', label: '酸绿', color: '#a8dd35' },
  { value: 'pine', label: '松针绿', color: '#2f7d5b' },
  { value: 'teal', label: '青绿', color: '#0b7a73' },
  { value: 'indigo', label: '靛蓝', color: '#2a5fe0' },
  { value: 'amber', label: '暖橙', color: '#ff9f43' },
];

function selectAccent(accent: AccentId): void {
  accentMode.value = accent;
  setAccent(accent);
  applyAccent(accent);
}

function selectTheme(mode: ThemeMode): void {
  themeMode.value = mode;
  setThemeMode(mode);
  applyTheme(mode);
  ToastPlugin.success(`已切换为${themeOptions.find((item) => item.value === mode)?.label}`);
}
const totalRecords = computed(
  () => counts.value.body + counts.value.meal + counts.value.workout + counts.value.photo,
);

async function logout(): Promise<void> {
  auth.logout();
  await router.replace('/login');
}

defineOptions({ name: 'ProfileView' });

async function loadSummary(silent = false): Promise<void> {
  if (!silent) loading.value = true;
  try {
    const [body, meals, workouts, photos] = await Promise.all([
      getBodyRecords({ page: 1, pageSize: 1 }),
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
  } catch {
    // 统计失败不影响账户信息展示。
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
</script>

<template>
  <main class="view-page profile-page">
    <header class="profile-header">
      <h1>我的</h1>
      <p>管理账户，回顾你已经积累的记录。</p>
    </header>

    <section class="surface-card account-card">
      <div class="avatar">{{ displayName.slice(0, 1).toUpperCase() }}</div>
      <div class="account-card__body">
        <strong>{{ displayName }}</strong>
        <span>{{ auth.user?.email }}</span>
      </div>
      <span class="version-tag">V0.1</span>
    </section>

    <section class="content-section">
      <div class="section-heading">
        <h2>记录概览</h2>
        <span>共 {{ totalRecords }} 条</span>
      </div>
      <Skeleton v-if="loading" :loading="true" animation="gradient" :row-col="[1, 1]" />
      <div v-else class="stat-grid">
        <div v-for="item in stats" :key="item.label">
          <span>{{ item.label }}</span>
          <strong
            >{{ item.value }} <small>{{ item.unit }}</small></strong
          >
        </div>
      </div>
    </section>

    <section class="content-section">
      <div class="section-heading">
        <h2>外观</h2>
        <span>深色模式</span>
      </div>
      <div class="theme-switch">
        <button
          v-for="item in themeOptions"
          :key="item.value"
          type="button"
          :class="{ active: themeMode === item.value }"
          @click="selectTheme(item.value)"
        >
          {{ item.label }}
        </button>
      </div>
    </section>

    <section class="content-section">
      <div class="section-heading">
        <h2>强调色</h2>
        <span>点击即时预览</span>
      </div>
      <div class="accent-switch">
        <button
          v-for="item in accentOptions"
          :key="item.value"
          type="button"
          :class="{ active: accentMode === item.value }"
          @click="selectAccent(item.value)"
        >
          <i :style="{ background: item.color }" />
          <span>{{ item.label }}</span>
        </button>
      </div>
    </section>

    <section class="surface-card meta-card">
      <div>
        <span>当前体重</span>
        <strong>{{ latestBody ? `${latestBody.weight} kg` : '还未记录' }}</strong>
        <small>{{
          latestBody ? dayjs(latestBody.recordedAt).format('M月D日记录') : '从第一条身体数据开始'
        }}</small>
      </div>
      <div>
        <span>开始使用</span>
        <strong>{{
          auth.user?.createdAt ? dayjs(auth.user.createdAt).format('YYYY年M月D日') : '—'
        }}</strong>
        <small>FitTrace V0.1</small>
      </div>
    </section>

    <Button
      class="logout-button"
      theme="default"
      variant="outline"
      block
      size="large"
      @click="logout"
    >
      <LogoutIcon /> 退出登录
    </Button>
  </main>
</template>

<style scoped lang="scss">
.profile-header {
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
    font-size: 0.875rem;
  }
}

.account-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 15px;

  &__body {
    display: flex;
    min-width: 0;
    flex: 1;
    flex-direction: column;
    gap: 4px;

    strong {
      font-size: 1rem;
    }

    span {
      overflow: hidden;
      max-width: 100%;
      color: var(--color-text-secondary);
      font-size: 0.875rem;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
}

.avatar {
  display: grid;
  width: 46px;
  height: 46px;
  flex: none;
  place-items: center;
  color: var(--color-text-primary);
  font-size: 1.1rem;
  font-weight: 800;
  background: var(--color-primary-light);
  border: 1px solid var(--color-primary-border);
  border-radius: 13px;
}

.version-tag {
  padding: 4px 8px;
  color: var(--color-text-secondary);
  font-size: 0.75rem;
  font-weight: 750;
  background: var(--color-surface-muted);
  border-radius: 6px;
}

.content-section {
  margin-top: 24px;
}

.section-heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 11px;

  h2 {
    margin: 0;
    font-size: 1rem;
    font-weight: 800;
  }

  span {
    color: var(--color-text-tertiary);
    font-size: 0.75rem;
  }
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1px;
  overflow: hidden;
  background: var(--color-border);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius-md);

  > div {
    display: grid;
    gap: 5px;
    padding: 13px 14px;
    background: var(--color-surface);
  }

  span {
    color: var(--color-text-tertiary);
    font-size: 0.75rem;
  }

  strong {
    font-size: 1.05rem;
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.03em;

    small {
      font-size: 0.75rem;
      font-weight: 500;
    }
  }
}

.theme-switch {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;

  button {
    padding: 11px 6px;
    color: var(--color-text-secondary);
    font-size: 0.875rem;
    font-weight: 700;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 10px;

    &.active {
      color: var(--color-text-primary);
      background: var(--color-primary-light);
      border-color: var(--color-primary-border);
    }
  }
}

.accent-switch {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 6px;

  button {
    display: grid;
    justify-items: center;
    gap: 6px;
    padding: 11px 2px;
    color: var(--color-text-secondary);
    font-size: 0.75rem;
    font-weight: 700;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 10px;

    i {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      box-shadow: inset 0 0 0 1px rgb(0 0 0 / 8%);
    }

    &.active {
      color: var(--color-text-primary);
      background: var(--color-primary-light);
      border-color: var(--color-primary-border);
    }
  }
}

.meta-card {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin-top: 14px;

  > div {
    display: grid;
    gap: 4px;
    padding: 14px;

    + div {
      border-left: 1px solid var(--color-border);
    }
  }

  span {
    color: var(--color-text-tertiary);
    font-size: 0.75rem;
  }

  strong {
    font-size: 0.9375rem;
  }

  small {
    color: var(--color-text-tertiary);
    font-size: 0.75rem;
  }
}

.logout-button {
  margin-top: var(--spacing-md);
}
</style>
