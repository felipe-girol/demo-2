<script setup lang="ts">
import { computed } from 'vue'
import type { Launch } from '../types/launch.type'
import type { Rocket } from '../types/rocket.type'

const props = defineProps<{ launches: Launch[]; rockets: Rocket[] }>()

const emit = defineEmits<{
  edit: [launch: Launch]
  delete: [launch: Launch]
}>()

/** Resolve rocketId -> rocket name for fast, graceful display. */
const rocketNameById = computed<Map<string, string>>(
  () => new Map(props.rockets.map((r) => [r.id, r.name])),
)

function rocketName(rocketId: string): string {
  // Degrade gracefully when a rocketId has no matching rocket.
  return rocketNameById.value.get(rocketId) ?? `Unknown rocket (${rocketId})`
}

function formatDate(iso: string): string {
  const time = Date.parse(iso)
  if (Number.isNaN(time)) return iso
  return new Date(time).toLocaleString()
}

function formatPrice(price: number): string {
  return price.toLocaleString(undefined, { style: 'currency', currency: 'USD' })
}
</script>

<template>
  <table class="launch-list">
    <caption class="visually-hidden">Scheduled launches</caption>
    <thead>
      <tr>
        <th scope="col">Mission</th>
        <th scope="col">Rocket</th>
        <th scope="col">Date</th>
        <th scope="col">Price/seat</th>
        <th scope="col">Min. passengers</th>
        <th scope="col">Seats offered</th>
        <th scope="col"><span class="visually-hidden">Actions</span></th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="launch in launches" :key="launch.id">
        <td>{{ launch.mission }}</td>
        <td>{{ rocketName(launch.rocketId) }}</td>
        <td>{{ formatDate(launch.date) }}</td>
        <td>{{ formatPrice(launch.pricePerSeat) }}</td>
        <td>{{ launch.minPassengers }}</td>
        <td>{{ launch.seatsOffered }}</td>
        <td class="row-actions">
          <button type="button" class="link" @click="emit('edit', launch)">
            Edit<span class="visually-hidden"> {{ launch.mission }}</span>
          </button>
          <button type="button" class="link danger" @click="emit('delete', launch)">
            Delete<span class="visually-hidden"> {{ launch.mission }}</span>
          </button>
        </td>
      </tr>
    </tbody>
  </table>
</template>

<style scoped>
.launch-list {
  width: 100%;
  border-collapse: collapse;
}

.launch-list th,
.launch-list td {
  padding: 0.6rem 0.75rem;
  text-align: left;
  border-bottom: 1px solid var(--border);
}

.launch-list th {
  color: var(--text-h);
  font-weight: 600;
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
