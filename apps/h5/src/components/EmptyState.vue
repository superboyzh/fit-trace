<script setup lang="ts">
import { Button } from 'tdesign-mobile-vue';
import { DataIcon } from 'tdesign-icons-vue-next';

defineProps<{ title: string; description?: string; actionLabel?: string }>();
const emit = defineEmits<{ action: [] }>();
</script>

<template>
  <section class="empty-state" :aria-label="title">
    <div class="empty-state__image" aria-hidden="true">
      <slot name="image"><DataIcon /></slot>
    </div>
    <h2>{{ title }}</h2>
    <p v-if="description">{{ description }}</p>
    <div v-if="actionLabel || $slots.action" class="empty-state__action">
      <slot name="action">
        <Button theme="primary" size="small" @click="emit('action')">{{ actionLabel }}</Button>
      </slot>
    </div>
  </section>
</template>

<style scoped lang="scss">
.empty-state {
  display: grid;
  justify-items: center;
  gap: 10px;
  padding: 36px 16px;
  text-align: center;

  &__image {
    display: grid;
    width: 48px;
    height: 48px;
    place-items: center;
    color: var(--color-text-tertiary);
    background: var(--color-surface-muted);
    border-radius: 14px;
    font-size: 24px;
  }

  h2 {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
  }

  p {
    max-width: 280px;
    margin: 0;
    color: var(--color-text-secondary);
    font-size: 0.8125rem;
    line-height: 1.7;
  }

  &__action {
    margin-top: 6px;
  }
}
</style>
