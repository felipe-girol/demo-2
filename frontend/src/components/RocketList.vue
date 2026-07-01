<script setup lang="ts">
import type { Rocket } from '../types/rocket.type'

defineProps<{ rockets: Rocket[] }>()

const emit = defineEmits<{
  edit: [rocket: Rocket]
  delete: [rocket: Rocket]
}>()
</script>

<template>
  <table class="rocket-list">
    <caption class="visually-hidden">Rocket fleet</caption>
    <thead>
      <tr>
        <th scope="col">Name</th>
        <th scope="col">Range</th>
        <th scope="col">Capacity</th>
        <th scope="col"><span class="visually-hidden">Actions</span></th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="rocket in rockets" :key="rocket.id">
        <td>{{ rocket.name }}</td>
        <td>{{ rocket.range }}</td>
        <td>{{ rocket.capacity }}</td>
        <td class="row-actions">
          <button type="button" class="link" @click="emit('edit', rocket)">
            Edit<span class="visually-hidden"> {{ rocket.name }}</span>
          </button>
          <button type="button" class="link danger" @click="emit('delete', rocket)">
            Delete<span class="visually-hidden"> {{ rocket.name }}</span>
          </button>
        </td>
      </tr>
    </tbody>
  </table>
</template>

<style scoped>
.rocket-list {
  width: 100%;
  border-collapse: collapse;
}

.rocket-list th,
.rocket-list td {
  padding: 0.6rem 0.75rem;
  text-align: left;
  border-bottom: 1px solid var(--border);
}

.rocket-list th {
  color: var(--text-h);
  font-weight: 600;
}

.rocket-list td {
  text-transform: capitalize;
}

.row-actions {
  display: flex;
  gap: 0.75rem;
}

.link {
  font: inherit;
  cursor: pointer;
  padding: 0;
  border: 0;
  background: none;
  color: var(--accent);
  text-decoration: underline;
}

.link.danger {
  color: #c0392b;
}

.link:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
</style>
