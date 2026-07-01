<script setup lang="ts">
import AppNav from './AppNav.vue'
import HealthIndicator from './HealthIndicator.vue'
</script>

<template>
  <div class="app-layout">
    <header class="app-header">
      <div class="brand">
        <RouterLink to="/" class="brand-link">AstroBookings</RouterLink>
      </div>
      <AppNav />
      <HealthIndicator />
    </header>

    <main class="app-content">
      <slot />
    </main>

    <footer class="app-footer">
      <small>AstroBookings — rocket launch bookings</small>
    </footer>
  </div>
</template>

<style scoped>
.app-layout {
  display: flex;
  flex-direction: column;
  min-height: 100svh;
}

.app-header {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  flex-wrap: wrap;
  padding: 0.9rem 1.5rem;
  border-bottom: 1px solid var(--border);
}

.brand-link {
  font-weight: 600;
  color: var(--text-h);
  text-decoration: none;
}

.app-header :deep(.health-indicator) {
  margin-left: auto;
}

.app-content {
  flex: 1 1 auto;
  width: 100%;
  max-width: 960px;
  margin: 0 auto;
  padding: 1.5rem;
  box-sizing: border-box;
  text-align: left;
}

.app-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--border);
  color: var(--text);
  text-align: center;
}
</style>
