<script setup lang="ts">
import { computed } from 'vue';
import { Button } from 'tdesign-vue-next';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();
const navigation = [
  { path: '/dashboard', label: '首页', icon: '⌂' },
  { path: '/record', label: '记录', icon: '+' },
  { path: '/trends', label: '趋势', icon: '↗' },
  { path: '/profile', label: '我的', icon: '○' },
];

const activePath = computed(() => {
  if (route.path.startsWith('/body')) return '/record';
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
        :class="{ active: activePath === item.path }"
        variant="text"
        size="large"
        @click="navigate(item.path)"
      >
        <span class="bottom-nav__icon" aria-hidden="true">{{ item.icon }}</span>
        <span>{{ item.label }}</span>
      </Button>
    </nav>
  </div>
</template>

<style scoped lang="scss">
.app-shell {
  width: min(100%, 560px);
  min-height: 100vh;
  margin: 0 auto;
  background: var(--color-background);

  &__content {
    min-height: 100vh;
    padding-bottom: calc(82px + env(safe-area-inset-bottom));
  }
}

.bottom-nav {
  position: fixed;
  z-index: 20;
  bottom: 0;
  left: 50%;
  display: grid;
  width: min(100%, 560px);
  grid-template-columns: repeat(4, 1fr);
  padding: 7px 10px calc(7px + env(safe-area-inset-bottom));
  background: rgb(255 255 255 / 94%);
  border-top: 1px solid var(--color-border);
  box-shadow: 0 -10px 32px rgb(38 55 77 / 7%);
  transform: translateX(-50%);
  backdrop-filter: blur(18px);

  &__item.t-button {
    height: 54px;
    padding: 4px;
    color: var(--color-text-tertiary);
    border-radius: 12px;

    :deep(.t-button__text) {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
      font-size: 0.7rem;
    }

    &.active {
      color: var(--color-primary);
      background: var(--color-primary-light);
    }
  }

  &__icon {
    font-size: 1.25rem;
    font-weight: 700;
    line-height: 1;
  }
}
</style>
