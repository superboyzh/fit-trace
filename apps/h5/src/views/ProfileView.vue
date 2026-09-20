<script setup lang="ts">
import type { BodyRecord } from '@fit-trace/shared';
import dayjs from 'dayjs';
import { Button, Skeleton } from 'tdesign-mobile-vue';
import { LogoutIcon } from 'tdesign-icons-vue-next';
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { getBodyRecords } from '@/api/body-records';
import { getMeals } from '@/api/meals';
import { getProgressPhotos } from '@/api/progress-photos';
import { getWorkouts } from '@/api/workouts';
import { useAuthStore } from '@/stores/auth';

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
const totalRecords = computed(
  () => counts.value.body + counts.value.meal + counts.value.workout + counts.value.photo,
);

async function logout(): Promise<void> {
  auth.logout();
  await router.replace('/login');
}

onMounted(async () => {
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
    loading.value = false;
  }
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
    font-size: 0.76rem;
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
      font-size: 0.95rem;
    }

    span {
      overflow: hidden;
      max-width: 100%;
      color: var(--color-text-secondary);
      font-size: 0.72rem;
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
  color: var(--color-ink);
  font-size: 1.1rem;
  font-weight: 800;
  background: var(--color-primary-light);
  border: 1px solid #dce9bd;
  border-radius: 13px;
}

.version-tag {
  padding: 4px 8px;
  color: var(--color-text-secondary);
  font-size: 0.6rem;
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
    font-size: 0.68rem;
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
    font-size: 0.64rem;
  }

  strong {
    font-size: 1.05rem;
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.03em;

    small {
      font-size: 0.6rem;
      font-weight: 500;
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
    font-size: 0.64rem;
  }

  strong {
    font-size: 0.82rem;
  }

  small {
    color: var(--color-text-tertiary);
    font-size: 0.6rem;
  }
}

.logout-button {
  margin-top: var(--spacing-md);
}
</style>
