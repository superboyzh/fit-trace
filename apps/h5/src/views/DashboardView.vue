<script setup lang="ts">
const plannedModules = ['身体数据', '饮食记录', '训练记录', '身材照片'];
</script>

<template>
  <main class="page-container">
    <header class="hero">
      <span class="hero__eyebrow">FITTRACE · V0.1</span>
      <h1>记录每一次改变</h1>
      <p>身体数据、饮食、训练与身材变化，将在这里形成你的长期轨迹。</p>
    </header>

    <section class="status-card" aria-labelledby="phase-title">
      <div>
        <span class="status-card__label">当前阶段</span>
        <h2 id="phase-title">基础架构已就绪</h2>
      </div>
      <span class="status-card__badge">Phase 1</span>
    </section>

    <section aria-labelledby="modules-title">
      <h2 id="modules-title" class="section-title">即将支持</h2>
      <div class="module-grid">
        <article v-for="item in plannedModules" :key="item" class="module-card">
          <span class="module-card__dot" />
          <strong>{{ item }}</strong>
          <small>按产品阶段逐步开放</small>
        </article>
      </div>
    </section>
  </main>
</template>

<style scoped lang="scss">
.hero {
  padding: var(--spacing-xl) 0 var(--spacing-lg);

  &__eyebrow {
    color: var(--color-primary);
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.12em;
  }

  h1 {
    margin: var(--spacing-sm) 0;
    font-size: clamp(2rem, 9vw, 3rem);
    line-height: 1.12;
  }

  p {
    max-width: 32rem;
    margin: 0;
    color: var(--color-text-secondary);
    line-height: 1.7;
  }
}

.status-card {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-xl);
  padding: var(--spacing-lg);
  color: #fff;
  background: linear-gradient(135deg, #1677ff, #5b5fe9);
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow-card);

  &__label {
    font-size: 0.75rem;
    opacity: 0.76;
  }

  h2 {
    margin: var(--spacing-xs) 0 0;
    font-size: 1.2rem;
  }

  &__badge {
    flex: none;
    padding: 6px 10px;
    font-size: 0.75rem;
    font-weight: 700;
    background: rgb(255 255 255 / 18%);
    border: 1px solid rgb(255 255 255 / 28%);
    border-radius: 999px;
  }
}

.section-title {
  margin: 0 0 var(--spacing-md);
  font-size: 1rem;
}

.module-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--spacing-sm);
}

.module-card {
  display: flex;
  min-height: 104px;
  flex-direction: column;
  align-items: flex-start;
  padding: var(--spacing-md);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius-md);

  &__dot {
    width: 8px;
    height: 8px;
    margin-bottom: auto;
    background: var(--color-primary);
    border-radius: 50%;
  }

  strong {
    margin-top: var(--spacing-md);
    font-size: 0.9rem;
  }

  small {
    margin-top: 3px;
    color: var(--color-text-secondary);
    font-size: 0.7rem;
  }
}
</style>
