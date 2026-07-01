<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useAsync } from '../composables/use-async'
import { getHealth } from '../services/api-client'
import type { HealthStatus } from '../types/health.type'

const { data, error, loading, run } = useAsync<HealthStatus>()

type IndicatorState = 'checking' | 'reachable' | 'unreachable'

const state = computed<IndicatorState>(() => {
  if (loading.value) return 'checking'
  if (error.value || !data.value) return 'unreachable'
  return 'reachable'
})

const label = computed(() => {
  switch (state.value) {
    case 'reachable':
      return 'API reachable'
    case 'unreachable':
      return 'API unreachable'
    default:
      return 'Checking API…'
  }
})

onMounted(() => run(getHealth))
</script>

<template>
  <div class="health-indicator" :class="`is-${state}`" role="status" aria-live="polite">
    <span class="dot" aria-hidden="true"></span>
    <span class="health-label">{{ label }}</span>
  </div>
</template>

<style scoped>
.health-indicator {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.85rem;
  color: var(--text);
}

.dot {
  width: 0.6rem;
  height: 0.6rem;
  border-radius: 50%;
  background: var(--border);
}

.is-checking .dot {
  background: #f1c40f;
}

.is-reachable .dot {
  background: #2ecc71;
}

.is-unreachable .dot {
  background: #e74c3c;
}
</style>
