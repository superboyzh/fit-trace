<script setup lang="ts">
import { ref, watch } from 'vue';

const props = withDefaults(defineProps<{ url?: string | null; name: string; size?: number }>(), {
  url: null,
  size: 52,
});
const failed = ref(false);
watch(
  () => props.url,
  () => {
    failed.value = false;
  },
);
</script>

<template>
  <span class="user-avatar" :style="{ '--avatar-size': `${size}px` }" aria-hidden="true">
    <img v-if="url && !failed" :src="url" alt="" @error="failed = true" />
    <span v-else>{{ name.slice(0, 1).toUpperCase() }}</span>
  </span>
</template>

<style scoped lang="scss">
.user-avatar {
  display: inline-grid;
  width: var(--avatar-size);
  height: var(--avatar-size);
  flex: none;
  place-items: center;
  overflow: hidden;
  color: var(--color-accent-text);
  font-size: calc(var(--avatar-size) * 0.4);
  font-weight: 600;
  background: var(--color-primary-light);
  border: 1px solid var(--color-primary-border);
  border-radius: 50%;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}
</style>
