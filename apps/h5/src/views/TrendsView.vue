<script setup lang="ts">
import type {
  BodyTrendData,
  BodyTrendDays,
  BodyTrendMetric,
  BodyTrendStats,
} from '@fit-trace/shared';
import dayjs from 'dayjs';
import { LineChart, type LineSeriesOption } from 'echarts/charts';
import {
  GridComponent,
  TooltipComponent,
  type GridComponentOption,
  type TooltipComponentOption,
} from 'echarts/components';
import { init, use, type ComposeOption, type EChartsType } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { Button, Empty, Loading } from 'tdesign-mobile-vue';
import { ChartLineIcon, RefreshIcon } from 'tdesign-icons-vue-next';
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { getBodyTrends } from '@/api/body-records';

interface MetricOption {
  key: BodyTrendMetric;
  label: string;
  unit: string;
}

type ChartOption = ComposeOption<LineSeriesOption | GridComponentOption | TooltipComponentOption>;

use([LineChart, GridComponent, TooltipComponent, CanvasRenderer]);

const router = useRouter();
const ranges: BodyTrendDays[] = [7, 30, 90];
const metrics: MetricOption[] = [
  { key: 'weight', label: '体重', unit: 'kg' },
  { key: 'bodyFat', label: '体脂率', unit: '%' },
  { key: 'waist', label: '腰围', unit: 'cm' },
];
const selectedRange = ref<BodyTrendDays>(30);
const selectedMetric = ref<BodyTrendMetric>('weight');
const trendData = ref<BodyTrendData | null>(null);
const loading = ref(true);
const errorMessage = ref('');
const chartElement = ref<HTMLDivElement | null>(null);
let chart: EChartsType | null = null;
let resizeObserver: ResizeObserver | null = null;

const metric = computed(
  () => metrics.find((item) => item.key === selectedMetric.value) ?? metrics[0],
);
const series = computed(() => trendData.value?.[selectedMetric.value] ?? null);
const stats = computed(() => series.value?.stats ?? null);

function formatValue(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function formatChange(value: number): string {
  return `${value > 0 ? '+' : ''}${formatValue(value)}`;
}

function createChartOption(): ChartOption {
  const points = series.value?.points ?? [];
  return {
    animationDuration: 450,
    grid: { top: 24, right: 12, bottom: 30, left: 44 },
    tooltip: {
      trigger: 'axis',
      borderWidth: 0,
      backgroundColor: '#111715',
      textStyle: { color: '#fff' },
      formatter: (params) => {
        const item = Array.isArray(params) ? params[0] : params;
        const point = points[item?.dataIndex ?? 0];
        if (!point) return '';
        return `${dayjs(point.recordedAt).format('M月D日 HH:mm')}<br/>${metric.value.label}：${formatValue(point.value)} ${metric.value.unit}`;
      },
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: points.map((point) => dayjs(point.recordedAt).format('M/D')),
      axisLine: { lineStyle: { color: '#dce2dc' } },
      axisTick: { show: false },
      axisLabel: { color: '#89928e', fontSize: 11, hideOverlap: true },
    },
    yAxis: {
      type: 'value',
      scale: true,
      splitNumber: 3,
      axisLabel: { color: '#89928e', fontSize: 11 },
      splitLine: { lineStyle: { color: '#edf0ed', type: 'dashed' } },
    },
    series: [
      {
        type: 'line',
        data: points.map((point) => point.value),
        smooth: true,
        symbol: 'circle',
        symbolSize: 7,
        showSymbol: points.length < 15,
        lineStyle: { color: '#111715', width: 3 },
        itemStyle: { color: '#b8f23d', borderColor: '#111715', borderWidth: 2 },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(184, 242, 61, 0.38)' },
              { offset: 1, color: 'rgba(184, 242, 61, 0.02)' },
            ],
          },
        },
      },
    ],
  };
}

async function renderChart(): Promise<void> {
  await nextTick();
  if (!chartElement.value || !series.value?.points.length) {
    chart?.dispose();
    chart = null;
    return;
  }
  chart ??= init(chartElement.value);
  chart.setOption(createChartOption(), true);
  chart.resize();
}

async function loadTrends(): Promise<void> {
  loading.value = true;
  errorMessage.value = '';
  try {
    trendData.value = await getBodyTrends(selectedRange.value);
  } catch {
    trendData.value = null;
    errorMessage.value = '趋势数据加载失败，请稍后重试';
  } finally {
    loading.value = false;
  }
}

async function selectRange(range: BodyTrendDays): Promise<void> {
  if (range === selectedRange.value) return;
  selectedRange.value = range;
  await loadTrends();
}

function statItems(value: BodyTrendStats) {
  return [
    { label: '当前值', value: formatValue(value.current) },
    { label: '起始值', value: formatValue(value.start) },
    { label: '变化值', value: formatChange(value.change), change: value.change },
    { label: '最高值', value: formatValue(value.max) },
    { label: '最低值', value: formatValue(value.min) },
    { label: '平均值', value: formatValue(value.average) },
  ];
}

watch([series, selectedMetric], renderChart, { flush: 'post' });

onMounted(async () => {
  await loadTrends();
  resizeObserver = new ResizeObserver(() => chart?.resize());
  if (chartElement.value) resizeObserver.observe(chartElement.value);
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  chart?.dispose();
});
</script>

<template>
  <main class="view-page trends-page">
    <header class="page-header">
      <span class="page-header__eyebrow">Insights</span>
      <h1>数据趋势</h1>
      <p>用 7 / 30 / 90 天视角观察真实变化。</p>
    </header>

    <div class="range-switch" aria-label="趋势时间范围">
      <Button
        v-for="range in ranges"
        :key="range"
        :theme="selectedRange === range ? 'primary' : 'default'"
        :variant="selectedRange === range ? 'base' : 'text'"
        @click="selectRange(range)"
      >
        {{ range }} 天
      </Button>
    </div>

    <Loading class="page-loading" :loading="loading" text="正在计算趋势">
      <section class="surface-card trend-card">
        <div class="metric-tabs" aria-label="趋势指标">
          <button
            v-for="item in metrics"
            :key="item.key"
            type="button"
            :class="{ active: selectedMetric === item.key }"
            @click="selectedMetric = item.key"
          >
            {{ item.label }}
          </button>
        </div>

        <div v-if="errorMessage" class="error-state">
          <span>{{ errorMessage }}</span>
          <Button size="small" variant="outline" @click="loadTrends">
            <RefreshIcon /> 重新加载
          </Button>
        </div>

        <template v-else-if="series?.points.length && stats">
          <div class="trend-heading">
            <div>
              <span>{{ selectedRange }} 天{{ metric.label }}趋势</span>
              <strong
                >{{ formatValue(stats.current) }} <small>{{ metric.unit }}</small></strong
              >
            </div>
            <span class="change-badge" :class="{ rise: stats.change > 0, fall: stats.change < 0 }">
              {{ formatChange(stats.change) }} {{ metric.unit }}
            </span>
          </div>

          <div
            ref="chartElement"
            class="trend-chart"
            role="img"
            :aria-label="`${metric.label}趋势图`"
          />

          <div class="stats-grid">
            <div v-for="item in statItems(stats)" :key="item.label">
              <span>{{ item.label }}</span>
              <strong
                :class="{
                  rise: item.change !== undefined && item.change > 0,
                  fall: item.change !== undefined && item.change < 0,
                }"
              >
                {{ item.value }} <small>{{ metric.unit }}</small>
              </strong>
            </div>
          </div>
        </template>

        <Empty
          v-else
          title="暂无该指标数据"
          :description="`${selectedRange} 天内还没有${metric.label}记录，记录后会自动生成趋势。`"
        >
          <template #image><ChartLineIcon class="empty-icon" /></template>
          <template #action>
            <Button theme="primary" @click="router.push('/body/create')">记录身体数据</Button>
          </template>
        </Empty>
      </section>
    </Loading>
  </main>
</template>

<style scoped lang="scss">
.trends-page {
  padding-bottom: 24px;
}

.range-switch {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
  margin-bottom: 14px;
  padding: 4px;
  background: var(--color-surface-muted);
  border-radius: 12px;

  :deep(.t-button) {
    width: 100%;
    border-radius: 9px;
  }
}

.trend-card {
  width: 100%;
  min-width: 0;
  min-height: 430px;
  padding: 18px;
}

.metric-tabs {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  padding-bottom: 16px;
  border-bottom: 1px solid var(--color-border);

  button {
    position: relative;
    padding: 7px 4px 11px;
    color: var(--color-text-tertiary);
    font-size: 0.8rem;
    font-weight: 750;
    background: transparent;
    border: 0;

    &::after {
      position: absolute;
      right: 28%;
      bottom: 0;
      left: 28%;
      height: 3px;
      background: transparent;
      border-radius: 3px;
      content: '';
    }

    &.active {
      color: var(--color-ink);

      &::after {
        background: var(--color-primary);
      }
    }
  }
}

.trend-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  padding: 20px 2px 0;

  > div {
    display: grid;
    gap: 5px;
  }

  span {
    color: var(--color-text-tertiary);
    font-size: 0.68rem;
  }

  strong {
    color: var(--color-ink);
    font-size: 2rem;
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.055em;

    small {
      font-size: 0.72rem;
      letter-spacing: 0;
    }
  }
}

.change-badge {
  padding: 6px 9px;
  color: var(--color-text-secondary) !important;
  font-weight: 750;
  background: var(--color-surface-muted);
  border-radius: 999px;

  &.fall {
    color: #27894f !important;
    background: #e8f7ed;
  }

  &.rise {
    color: #d44d49 !important;
    background: #fff0ef;
  }
}

.trend-chart {
  width: 100%;
  height: 230px;
  margin: 4px 0 14px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1px;
  overflow: hidden;
  background: var(--color-border);
  border: 1px solid var(--color-border);
  border-radius: 12px;

  > div {
    display: grid;
    gap: 5px;
    padding: 12px 9px;
    background: var(--color-surface-muted);
  }

  span {
    color: var(--color-text-tertiary);
    font-size: 0.62rem;
  }

  strong {
    color: var(--color-ink);
    font-size: 0.78rem;
    font-variant-numeric: tabular-nums;

    small {
      font-size: 0.58rem;
    }

    &.fall {
      color: #27894f;
    }

    &.rise {
      color: #d44d49;
    }
  }
}

.error-state {
  display: grid;
  min-height: 320px;
  place-items: center;
  align-content: center;
  gap: 14px;
  color: var(--color-text-secondary);
  font-size: 0.78rem;
}

:deep(.t-empty) {
  padding: 62px 8px 38px;
}

.empty-icon {
  color: var(--color-text-tertiary);
  font-size: 3.5rem;
}

@media (max-width: 360px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
