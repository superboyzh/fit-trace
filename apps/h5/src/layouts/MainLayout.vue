<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { Button } from 'tdesign-mobile-vue';
import { ChartLineIcon, DataIcon, HomeIcon, UserIcon } from 'tdesign-icons-vue-next';
import { useRoute, useRouter } from 'vue-router';
import RecordFab from '@/components/RecordFab.vue';

const route = useRoute();
const router = useRouter();
const TAB_ROOTS = ['/dashboard', '/trends', '/archive', '/profile'];
/** 四个主 tab 做缓存：切回来时内容还在，只在后台静默刷新 */
const CACHED_VIEWS = ['DashboardView', 'TrendsView', 'ArchiveView', 'ProfileView'];
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
const activeIndex = computed(() =>
  Math.max(
    0,
    navigation.findIndex((item) => item.path === activePath.value),
  ),
);
/** 只有四个主 tab 展示底部标签栏与悬浮按钮，二级页面隐藏（同 iOS hidesBottomBarWhenPushed） */
const showChrome = computed(() => route.meta.tabBar === true);

/**
 * 同级 tab 之间瞬切（苹果的标签栏就是瞬切，只有高亮在动）；
 * 进入子页面（详情、表单）才做方向性转场，暗示层级关系。
 */
const transitionName = ref('route-push');
let lastTab: string | null = TAB_ROOTS.includes(route.path) ? route.path : null;
watch(
  () => route.path,
  (path) => {
    const tab = TAB_ROOTS.includes(path) ? path : null;
    transitionName.value = tab && lastTab && tab !== lastTab ? 'route-none' : 'route-push';
    lastTab = tab;
  },
  { flush: 'pre' },
);

async function navigate(path: string): Promise<void> {
  if (route.path !== path) await router.push(path);
}
</script>

<template>
  <div class="app-shell" :class="{ 'app-shell--with-nav': showChrome }">
    <div class="app-shell__content">
      <RouterView v-slot="{ Component }">
        <Transition :name="transitionName" mode="out-in">
          <KeepAlive :include="CACHED_VIEWS">
            <component :is="Component" />
          </KeepAlive>
        </Transition>
      </RouterView>
    </div>
    <RecordFab v-if="showChrome" />
    <nav
      v-if="showChrome"
      class="bottom-nav"
      :style="{ '--active-index': activeIndex }"
      aria-label="主导航"
    >
      <span class="bottom-nav__indicator" aria-hidden="true" />
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

  /* 二级页面没有标签栏与悬浮按钮，收回预留空间 */
  &:not(.app-shell--with-nav) .app-shell__content {
    padding-bottom: var(--spacing-lg);
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

  /* 选中高亮是一枚滑动的胶囊，而不是两个背景色交叉淡入 */
  &__indicator {
    position: absolute;
    top: 6px;
    bottom: 6px;
    left: 6px;
    width: calc((100% - 18px) / 4);
    background: var(--color-primary-light);
    border-radius: 20px;
    transform: translateX(calc(var(--active-index, 0) * (100% + 2px)));
    transition: transform 320ms var(--ease-standard);
    pointer-events: none;
  }

  &__item.t-button {
    position: relative;
    z-index: 1;
    min-width: 0;
    height: auto;
    min-height: 50px;
    padding: 6px 4px;
    color: var(--color-text-tertiary);
    background: transparent;
    border: 0;
    border-radius: 20px;
    transition: color var(--duration-base) var(--ease-standard);

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
