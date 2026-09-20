<script setup lang="ts">
import { computed } from 'vue';
import { Button } from 'tdesign-mobile-vue';
import { AddIcon, ChartLineIcon, DataIcon, HomeIcon, UserIcon } from 'tdesign-icons-vue-next';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();
const navigation = [
  { path: '/dashboard', label: '首页', icon: HomeIcon },
  { path: '/trends', label: '趋势', icon: ChartLineIcon },
  { path: '/record', label: '记录', icon: AddIcon, primary: true },
  { path: '/archive', label: '档案', icon: DataIcon },
  { path: '/profile', label: '我的', icon: UserIcon },
];

const activePath = computed(() => {
  if (route.path.startsWith('/meals')) return '/record';
  if (route.path.startsWith('/workouts') || route.path.startsWith('/photos')) return '/record';
  if (route.path === '/body/create' || route.path.includes('/edit')) return '/record';
  if (route.path.startsWith('/body/history') || route.path.startsWith('/archive'))
    return '/archive';
  return navigation.find((item) => route.path.startsWith(item.path))?.path ?? '/dashboard';
});

async function navigate(path: string): Promise<void> {
  if (route.path !== path) await router.push(path);
}
</script>

<template>
  <div class="app-shell">
    <div class="app-shell__content">
      <RouterView />
    </div>
    <nav class="bottom-nav" aria-label="主导航">
      <Button
        v-for="item in navigation"
        :key="item.path"
        class="bottom-nav__item"
        :class="{ active: activePath === item.path, primary: item.primary }"
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
  box-shadow: 0 0 0 1px rgb(17 23 21 / 4%);

  &__content {
    min-height: 100vh;
    min-height: 100dvh;
    padding-bottom: var(--bottom-nav-space);
  }
}

.bottom-nav {
  position: fixed;
  z-index: 20;
  bottom: 0;
  left: 50%;
  display: grid;
  width: min(100%, 560px);
  grid-template-columns: repeat(5, 1fr);
  padding: 5px 8px calc(5px + env(safe-area-inset-bottom));
  background: rgb(255 255 255 / 98%);
  border-top: 1px solid var(--color-border);
  box-shadow: 0 -2px 12px rgb(38 55 77 / 5%);
  transform: translateX(-50%);
  backdrop-filter: blur(18px);

  &__item.t-button {
    height: 54px;
    padding: 4px;
    color: var(--color-text-tertiary);
    border-radius: 10px;

    :deep(.t-button__content) {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 3px;
      font-size: 0.64rem;
    }

    &.active {
      color: var(--color-ink);

      &:not(.primary) .bottom-nav__icon {
        background: var(--color-primary-light);
      }
    }

    &.primary .bottom-nav__icon {
      color: var(--color-ink);
      background: var(--color-primary-light);
    }
  }

  &__icon {
    display: grid;
    width: 30px;
    height: 26px;
    place-items: center;
    font-size: 1.25rem;
    line-height: 1;
  }
}
</style>
