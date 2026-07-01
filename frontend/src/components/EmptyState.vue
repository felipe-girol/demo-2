<script setup lang="ts">
withDefaults(defineProps<{ message?: string }>(), {
  message: 'Nothing here yet.',
})
</script>

<template>
  <div class="empty-state" role="status">
    <span class="empty-icon" aria-hidden="true">∅</span>
    <p>{{ message }}</p>
    <slot name="action" />
  </div>
</template>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 2.5rem 1rem;
  color: var(--text);
  text-align: center;
}

.empty-icon {
  font-size: 2rem;
  color: var(--border);
}
</style>
