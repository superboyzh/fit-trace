<script setup lang="ts">
import type { WorkoutType } from '@fit-trace/shared';

defineProps<{ type: WorkoutType }>();
</script>

<!-- 统一 24×24、1.7 描边的单色线性图标，替代 emoji -->
<template>
  <svg
    class="sport-icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.7"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <template v-if="type === 'STRENGTH'">
      <path d="M4 9v6M7 7.5v9M17 7.5v9M20 9v6M7 12h10" />
    </template>
    <template v-else-if="type === 'CARDIO'">
      <path
        d="M12 20s-6.5-3.9-6.5-8.4A3.6 3.6 0 0 1 12 9.2a3.6 3.6 0 0 1 6.5 2.4C18.5 16.1 12 20 12 20Z"
      />
      <path d="M5.5 13.4h3l1.3-2.2 1.6 3.4 1.3-2.4 1.1 1.2h3.7" />
    </template>
    <template v-else-if="type === 'RUNNING'">
      <circle cx="15.5" cy="5" r="1.9" />
      <path d="M13.4 8.6 9.8 11l2.5 2.3-2 4.2M13.4 8.6l3 1.8 2.8-.6M12.3 13.3l3.7 1.4 1.1 4" />
    </template>
    <template v-else-if="type === 'CYCLING'">
      <circle cx="6" cy="16.5" r="3.2" />
      <circle cx="18" cy="16.5" r="3.2" />
      <path d="M6 16.5 10 9h4l-2.5 7.5M10 9 8.4 6.6h2.2M14 9l3.2 3.4" />
    </template>
    <template v-else-if="type === 'SWIMMING'">
      <circle cx="16.5" cy="7" r="2" />
      <path
        d="M4 14.5c1.7-1.5 3-1.5 4.5 0s3.9 1.5 5.5 0 3-1.5 4.5 0M4 19c1.7-1.5 3-1.5 4.5 0s3.9 1.5 5.5 0 3-1.5 4.5 0M13.5 9.5 9 13"
      />
    </template>
    <template v-else>
      <path d="M6 21V4.5M6 5h9.5l-1.6 3.6L15.5 12H6" />
    </template>
  </svg>
</template>

<style scoped lang="scss">
.sport-icon {
  width: 1.15em;
  height: 1.15em;
  display: block;
}
</style>
