<script setup lang="ts">
withDefaults(
  defineProps<{
    title?: string
    message: string
    confirmLabel?: string
    cancelLabel?: string
    busy?: boolean
  }>(),
  {
    title: 'Please confirm',
    confirmLabel: 'Confirm',
    cancelLabel: 'Cancel',
    busy: false,
  },
)

const emit = defineEmits<{ confirm: []; cancel: [] }>()
</script>

<template>
  <div class="confirm-backdrop" @click.self="emit('cancel')">
    <div
      class="confirm-dialog"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      aria-describedby="confirm-message"
    >
      <h2 id="confirm-title">{{ title }}</h2>
      <p id="confirm-message">{{ message }}</p>
      <div class="actions">
        <button type="button" class="danger" :disabled="busy" @click="emit('confirm')">
          {{ busy ? 'Working…' : confirmLabel }}
        </button>
        <button type="button" class="ghost" :disabled="busy" @click="emit('cancel')">
          {{ cancelLabel }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.confirm-backdrop {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.4);
  z-index: 50;
}

.confirm-dialog {
  max-width: 24rem;
  padding: 1.5rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg);
  box-shadow: var(--shadow);
}

.actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
}

button {
  font: inherit;
  cursor: pointer;
  padding: 0.45rem 1rem;
  border-radius: 6px;
  transition: box-shadow 0.2s;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.danger {
  border: 1px solid #c0392b;
  color: var(--bg);
  background: #c0392b;
}

.ghost {
  border: 1px solid var(--border);
  color: var(--text);
  background: var(--bg);
}

button:not(:disabled):hover {
  box-shadow: var(--shadow);
}

button:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
</style>
