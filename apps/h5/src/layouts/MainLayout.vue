<script setup lang="ts">
import { computed } from 'vue';
import { Button } from 'tdesign-mobile-vue';
import { ChartLineIcon, DataIcon, HomeIcon, UserIcon } from 'tdesign-icons-vue-next';
import { useRoute, useRouter } from 'vue-router';
import RecordFab from '@/components/RecordFab.vue';

const route = useRoute();
const router = useRouter();
const navigation = [
  { path: '/dashboard', label: '首页', icon: HomeIcon },
  { path: '/trends', label: '趋势', icon: ChartLineIcon },
  { path: '/archive', label: '档案', icon: DataIcon },
  { path: '/profile', label: '我的', icon: UserIcon },
];

const activePath = computed(() => {
  if (route.path.startsWith('/meals')) return '/dashboard';
  if (route.path.startsWith('/workouts') || route.path.startsWith('/photos')) return '/dashboard';
  if (route.path === '/body/create' || route.path.includes('/edit')) return '/dashboard';
  if (/^\/body\/[^/]+$/.test(route.path)) return '/archive';
  if (route.path.startsWith('/body/history') || route.path.startsWith('/archive'))
    return '/archive';
  if (route.path.startsWith('/record')) return '/dashboard';
  return navigation.find((item) => route.path.startsWith(item.path))?.path ?? '/dashboard';
});

async function navigate(path: string): Promise<void> {
  if (route.path !== path) await router.push(path);
}
</script>

<template>
  <div class="app-shell">
    <div class="app-shell__content">
      <RouterView v-slot="{ Component }">
        <Transition name="route-fade" mode="out-in">
          <component :is="Component" />
        </Transition>
      </RouterView>
    </div>
    <RecordFab />
    <nav class="bottom-nav" aria-label="主导航">
      <Button
        v-for="item in navigation"
        :key="item.path"
        class="bottom-nav__item"
        :class="{ active: activePath === item.path }"
        variant="text"
        size="large"
        @click="navigate(item.path)"
      >
        <span class="bottom-nav__icon" aria-hidden="true"><component :is="item.icon" /></span>
        <span>{{ item.label }}</span>
      </Button>
    </nav>
  </div>
</template>

<style scoped lang="scss">
.app-shell {
  width: min(100%, 560px);
  min-height: 100vh;
  min-height: 100dvh;
  margin: 0 auto;
  background: var(--color-background);
  box-shadow: 0 0 0 1px var(--color-border);

  &__content {
    min-height: 100vh;
    min-height: 100dvh;
    /* 留出悬浮按钮的高度，避免盖住卡片右下角的操作 */
    padding-bottom: calc(var(--bottom-nav-space) + 64px);
  }
}

.bottom-nav {
  position: fixed;
  z-index: 20;
  left: 50%;
  /* 悬浮胶囊：离底边留白，比贴边通栏更接近 iOS 26 的观感 */
  bottom: max(10px, env(safe-area-inset-bottom));
  display: grid;
  width: min(calc(100% - 24px), 520px);
  grid-template-columns: repeat(4, 1fr);
  gap: 2px;
  padding: 6px;
  background: var(--color-surface-translucent);
  border: 1px solid var(--color-border);
  border-radius: 26px;
  box-shadow: 0 12px 32px rgb(20 28 25 / 14%);
  transform: translateX(-50%);
  backdrop-filter: saturate(180%) blur(24px);

  &__item.t-button {
    min-width: 0;
    height: auto;
    min-height: 50px;
    padding: 6px 4px;
    color: var(--color-text-tertiary);
    background: transparent;
    border: 0;
    border-radius: 20px;
    transition:
      color var(--duration-fast) var(--ease-standard),
      background-color var(--duration-base) var(--ease-standard);

    :deep(.t-button__content) {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 3px;
      font-size: 0.6875rem;
      font-weight: 500;
      letter-spacing: -0.01em;
    }

    &.active {
      color: var(--color-accent-text);
      background: var(--color-primary-light);

      :deep(.t-button__content) {
        font-weight: 650;
      }
    }
  }

  &__icon {
    display: grid;
    width: 25px;
    height: 25px;
    place-items: center;
    font-size: 1.35rem;
    line-height: 1;
  }
}
</style>
