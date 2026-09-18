<script setup lang="ts">
import { Button, Card, Empty } from 'tdesign-vue-next';
import { useRouter } from 'vue-router';

const router = useRouter();
</script>

<template>
  <main class="view-page">
    <header class="page-header">
      <span class="page-header__eyebrow">INSIGHTS</span>
      <h1>趋势</h1>
      <p>身体变化会在积累足够记录后变得清晰。</p>
    </header>
    <Card class="surface-card" :bordered="false">
      <Empty
        title="还没有趋势数据"
        description="先记录几次身体数据，下一阶段会生成 7 / 30 / 90 天趋势。"
      >
        <template #action>
          <Button theme="primary" @click="router.push('/body/create')">记录身体数据</Button>
        </template>
      </Empty>
    </Card>
  </main>
</template>
