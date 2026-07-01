<script setup lang="ts">
withDefaults(
  defineProps<{ message?: string; retryable?: boolean }>(),
  {
    message: 'Something went wrong.',
    retryable: true,
  },
)

const emit = defineEmits<{ retry: [] }>()
</script>

<template>
  <div class="error-state" role="alert">
    <p class="error-message">{{ message }}</p>
    <button
      v-if="retryable"
      type="button"
      class="retry-button"
      @click="emit('retry')"
    >
      Retry
    </button>
  </div>
</template>

<style scoped>
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 2rem 1rem;
  text-align: center;
}

.error-message {
  color: #c0392b;
}

.retry-button {
  font: inherit;
  cursor: pointer;
  padding: 0.4rem 1rem;
  border-radius: 6px;
  border: 1px solid var(--accent-border);
  color: var(--accent);
  background: var(--accent-bg);
  transition: box-shadow 0.2s;
}

.retry-button:hover {
  box-shadow: var(--shadow);
}

.retry-button:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
</style>
