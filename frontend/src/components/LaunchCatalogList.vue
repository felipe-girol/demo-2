<script setup lang="ts">
import { RouterLink } from 'vue-router'
import type { LaunchView } from '../types/launch.type'
import type { Rocket } from '../types/rocket.type'
import {
  formatLaunchDate,
  formatSeatPrice,
  isSoldOut,
  resolveRocketName,
} from '../utils/launch-format'

const props = defineProps<{ launches: LaunchView[]; rockets: Rocket[] }>()

function rocketName(rocketId: string): string {
  return resolveRocketName(rocketId, props.rockets)
}
</script>

<template>
  <table class="launch-catalog">
    <caption class="visually-hidden">Available launches</caption>
    <thead>
      <tr>
        <th scope="col">Mission</th>
        <th scope="col">Rocket</th>
        <th scope="col">Date</th>
        <th scope="col">Price/seat</th>
        <th scope="col">Seats available</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="launch in launches" :key="launch.id" :class="{ 'is-sold-out': isSoldOut(launch) }">
        <td>
          <RouterLink
            class="mission-link"
            :to="{ name: 'customer-launch-detail', params: { id: launch.id } }"
          >
            {{ launch.mission }}
          </RouterLink>
        </td>
        <td>{{ rocketName(launch.rocketId) }}</td>
        <td>{{ formatLaunchDate(launch.date) }}</td>
        <td>{{ formatSeatPrice(launch.pricePerSeat) }}</td>
        <td>
          <span v-if="isSoldOut(launch)" class="sold-out-badge">
            Sold out<span class="visually-hidden"> — no seats available</span>
          </span>
          <span v-else>{{ launch.seatsAvailable }}</span>
        </td>
      </tr>
    </tbody>
  </table>
</template>

<style scoped>
.launch-catalog {
  width: 100%;
  border-collapse: collapse;
}

.launch-catalog th,
.launch-catalog td {
  padding: 0.6rem 0.75rem;
  text-align: left;
  border-bottom: 1px solid var(--border);
}

.launch-catalog th {
  color: var(--text-h);
  font-weight: 600;
}

.is-sold-out td {
  color: var(--text);
  opacity: 0.7;
}

.mission-link {
  color: var(--accent);
  text-decoration: underline;
}

.mission-link:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.sold-out-badge {
  display: inline-block;
  padding: 0.1rem 0.5rem;
  border-radius: 999px;
  font-size: 0.85rem;
  font-weight: 600;
  color: #c0392b;
  background: rgba(192, 57, 43, 0.1);
}
</style>
