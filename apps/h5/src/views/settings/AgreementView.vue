<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import RecordDetailHeader from '@/components/RecordDetailHeader.vue';
import PolicyContent from '@/components/PolicyContent.vue';

const route = useRoute();
const kind = computed(() => (route.meta.policyKind === 'privacy' ? 'privacy' : 'agreement'));
</script>

<template>
  <main class="view-page agreement-page" :class="{ 'public-policy-page': route.meta.publicPolicy }">
    <RecordDetailHeader
      :title="kind === 'agreement' ? '用户协议' : '隐私政策'"
      :subtitle="
        kind === 'agreement' ? '循形 FitTrace · 基础使用条款' : '循形 FitTrace · 信息使用说明'
      "
    />
    <PolicyContent :kind="kind" />
  </main>
</template>

<style scoped lang="scss">
.public-policy-page {
  width: min(100%, 560px);
  min-height: 100dvh;
  margin: 0 auto;
  padding-top: var(--app-safe-area-top);
  padding-bottom: calc(24px + var(--app-safe-area-bottom));
}
</style>
