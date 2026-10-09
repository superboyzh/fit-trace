<script setup lang="ts">
import { Button } from 'tdesign-mobile-vue';
import { ChevronLeftIcon } from 'tdesign-icons-vue-next';
import { useRouter } from 'vue-router';

defineProps<{
  title: string;
  subtitle?: string;
  actionLabel?: string;
  actionLoading?: boolean;
}>();

const emit = defineEmits<{ action: [] }>();
const router = useRouter();
</script>

<template>
  <header class="detail-header">
    <div class="detail-header__row">
      <Button
        class="detail-header__back"
        variant="text"
        shape="round"
        aria-label="返回"
        @click="router.back()"
        ><ChevronLeftIcon
      /></Button>
      <h1>{{ title }}</h1>
      <Button
        v-if="actionLabel"
        class="detail-header__action"
        theme="primary"
        variant="text"
        size="small"
        :loading="actionLoading"
        @click="emit('action')"
      >
        {{ actionLabel }}
      </Button>
    </div>
    <p v-if="subtitle">{{ subtitle }}</p>
  </header>
</template>

<style scoped lang="scss">
.detail-header {
  padding: 12px 0 20px;

  &__row {
    display: flex;
    min-height: 44px;
    align-items: center;
    gap: 8px;
  }

  &__back.t-button {
    width: 44px;
    height: 44px;
    flex: none;
    margin-left: -12px;
    padding: 0;
    color: var(--color-text-primary);
    font-size: 22px;
  }

  &__action {
    flex: none;
  }

  h1 {
    min-width: 0;
    flex: 1;
    margin: 0;
    font-size: 1.125rem;
    font-weight: 600;
    line-height: 1.4;
  }

  p {
    margin: 8px 0 0;
    color: var(--color-text-secondary);
    font-size: 0.8125rem;
    line-height: 1.6;
  }
}
</style>
