<script setup lang="ts">
import { Button } from 'tdesign-mobile-vue';
import { ChevronLeftIcon } from 'tdesign-icons-vue-next';
import { useRouter } from 'vue-router';

defineProps<{
  title: string;
  subtitle?: string;
  actionLabel?: string;
}>();

const emit = defineEmits<{ action: [] }>();
const router = useRouter();
</script>

<template>
  <header class="detail-header">
    <Button variant="text" shape="round" @click="router.back()"><ChevronLeftIcon /> 返回</Button>
    <div class="detail-header__row">
      <div>
        <h1>{{ title }}</h1>
        <p v-if="subtitle">{{ subtitle }}</p>
      </div>
      <Button v-if="actionLabel" size="small" variant="outline" @click="emit('action')">
        {{ actionLabel }}
      </Button>
    </div>
  </header>
</template>

<style scoped lang="scss">
.detail-header {
  padding: 18px 0 18px;

  > .t-button {
    margin: 0 0 13px -10px;
  }

  &__row {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 12px;
  }

  h1 {
    margin: 0 0 5px;
    font-size: 1.7rem;
    letter-spacing: -0.04em;
  }

  p {
    margin: 0;
    color: var(--color-text-secondary);
    font-size: 0.9375rem;
  }
}
</style>
