<script setup lang="ts">
import {
  ActivityIcon,
  AddIcon,
  CameraIcon,
  ForkIcon,
  MeasurementIcon,
} from 'tdesign-icons-vue-next';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const router = useRouter();
const route = useRoute();
const open = ref(false);

const options = [
  { label: '身体数据', hint: '体重与围度', icon: MeasurementIcon, path: '/body/create' },
  { label: '饮食记录', hint: '拍照或手动', icon: ForkIcon, path: '/meals/create' },
  { label: '训练记录', hint: '类型与时长', icon: ActivityIcon, path: '/workouts/create' },
  { label: '身材照片', hint: '留一张存档', icon: CameraIcon, path: '/photos' },
];

/** 表单页已经有自己的保存入口，不必再叠一个悬浮按钮 */
const visible = computed(() => !/\/(create|edit)$/.test(route.path));

function toggle(): void {
  open.value = !open.value;
}

function close(): void {
  open.value = false;
}

function pick(path: string): void {
  close();
  void router.push(path);
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') close();
}

// 路由变化（含浏览器后退）时收起，避免展开状态残留
watch(() => route.fullPath, close);
onMounted(() => window.addEventListener('keydown', onKeydown));
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown));
</script>

<template>
  <div v-if="visible" class="record-fab" :class="{ 'is-open': open }">
    <Transition name="fab-scrim">
      <div v-if="open" class="record-fab__scrim" @click="close" />
    </Transition>

    <ul class="record-fab__options" :aria-hidden="!open">
      <li
        v-for="(item, index) in options"
        :key="item.path"
        :style="{ '--delay': `${index * 45}ms` }"
      >
        <button type="button" :tabindex="open ? 0 : -1" @click="pick(item.path)">
          <span class="record-fab__option-text">
            <strong>{{ item.label }}</strong>
            <small>{{ item.hint }}</small>
          </span>
          <span class="record-fab__option-icon"><component :is="item.icon" /></span>
        </button>
      </li>
    </ul>

    <button
      class="record-fab__trigger"
      type="button"
      :aria-expanded="open"
      aria-label="添加记录"
      @click="toggle"
    >
      <AddIcon />
    </button>
  </div>
</template>

<style scoped lang="scss">
.record-fab {
  position: fixed;
  z-index: 30;
  /* 贴在 560px 内容列的右下角，而不是视口边缘 */
  right: max(16px, calc(50vw - 264px));
  bottom: calc(var(--bottom-nav-space) + 14px);

  &__scrim {
    position: fixed;
    z-index: -1;
    inset: 0 0 var(--bottom-nav-space);
    background: rgb(17 23 21 / 28%);
    backdrop-filter: blur(1px);
  }

  &__options {
    position: absolute;
    right: 0;
    bottom: calc(100% + 12px);
    display: grid;
    min-width: 200px;
    gap: 9px;
    margin: 0;
    padding: 0;
    list-style: none;
    justify-items: end;

    li {
      opacity: 0;
      transform: translateY(10px) scale(0.96);
      transition:
        opacity var(--duration-base) var(--ease-standard),
        transform var(--duration-base) var(--ease-standard);
      pointer-events: none;
    }
  }

  &.is-open &__options li {
    opacity: 1;
    transform: none;
    transition-delay: var(--delay);
    pointer-events: auto;
  }

  &__options button {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 8px 8px 14px;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 14px;
    box-shadow: 0 6px 18px rgb(20 28 25 / 12%);

    &:active {
      background: var(--color-surface-muted);
    }
  }

  &__option-text {
    display: grid;
    gap: 2px;
    text-align: right;
    white-space: nowrap;

    strong {
      color: var(--color-text-primary);
      font-size: 0.875rem;
    }

    small {
      color: var(--color-text-tertiary);
      font-size: 0.75rem;
    }
  }

  &__option-icon {
    display: grid;
    width: 34px;
    height: 34px;
    flex: none;
    place-items: center;
    color: var(--color-text-primary);
    font-size: 1.05rem;
    background: var(--color-primary-light);
    border-radius: 10px;
  }

  &__trigger {
    display: grid;
    width: 56px;
    height: 56px;
    place-items: center;
    color: var(--color-on-brand);
    font-size: 1.5rem;
    background: var(--color-brand);
    border: 0;
    border-radius: 50%;
    box-shadow: 0 8px 22px rgb(20 28 25 / 24%);
    transition:
      transform var(--duration-base) var(--ease-standard),
      background-color var(--duration-fast) var(--ease-standard);

    svg {
      transition: transform var(--duration-base) var(--ease-standard);
    }

    &:active {
      transform: scale(0.94);
    }
  }

  &.is-open &__trigger svg {
    transform: rotate(45deg);
  }
}

.fab-scrim-enter-active,
.fab-scrim-leave-active {
  transition: opacity var(--duration-base) var(--ease-standard);
}

.fab-scrim-enter-from,
.fab-scrim-leave-to {
  opacity: 0;
}
</style>
