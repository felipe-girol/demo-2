<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import ErrorState from '../components/ErrorState.vue'
import LoadingState from '../components/LoadingState.vue'
import { useAsync } from '../composables/use-async'
import type { ApiResult } from '../types/api.type'
import type { LaunchView } from '../types/launch.type'
import type { Rocket } from '../types/rocket.type'
import { getLaunch } from '../services/launches-api'
import { listRockets } from '../services/rockets-api'
import {
  formatLaunchDate,
  formatSeatPrice,
  isSoldOut as isLaunchSoldOut,
  resolveRocketName,
} from '../utils/launch-format'

/** Combined payload so the launch and rockets share one loading/error cycle. */
type DetailData = { launch: LaunchView; rockets: Rocket[] }

const route = useRoute()
const launchId = computed<string>(() => String(route.params.id))

/** Load the launch and rockets together; surface the first failure. */
async function loadDetail(): Promise<ApiResult<DetailData>> {
  const [launchResult, rocketsResult] = await Promise.all([
    getLaunch(launchId.value),
    listRockets(),
  ])
  if (!launchResult.ok) return launchResult
  if (!rocketsResult.ok) return rocketsResult
  return { ok: true, data: { launch: launchResult.data, rockets: rocketsResult.data } }
}

const { data, error, loading, run, retry } = useAsync<DetailData>()

const launch = computed<LaunchView | null>(() => data.value?.launch ?? null)

const rocketName = computed<string>(() => {
  const current = launch.value
  if (!current) return ''
  return resolveRocketName(current.rocketId, data.value?.rockets ?? [])
})

const isSoldOut = computed<boolean>(() => (launch.value ? isLaunchSoldOut(launch.value) : false))

onMounted(() => run(loadDetail))
</script>

<template>
  <section aria-labelledby="detail-h">
    <p class="back">
      <RouterLink :to="{ name: 'customer-launches' }">← Back to catalog</RouterLink>
    </p>

    <LoadingState v-if="loading" label="Loading launch…" />
    <ErrorState
      v-else-if="error || !launch"
      :message="error?.message ?? 'This launch could not be found.'"
      @retry="retry"
    />
    <article v-else aria-labelledby="detail-h">
      <h1 id="detail-h">{{ launch.mission }}</h1>
      <p v-if="isSoldOut" class="sold-out-badge" role="status">
        Sold out<span class="visually-hidden"> — no seats available</span>
      </p>

      <dl class="detail-grid">
        <dt>Rocket</dt>
        <dd>{{ rocketName }}</dd>

        <dt>Date</dt>
        <dd>{{ formatLaunchDate(launch.date) }}</dd>

        <dt>Price per seat</dt>
        <dd>{{ formatSeatPrice(launch.pricePerSeat) }}</dd>

        <dt>Minimum passengers</dt>
        <dd>{{ launch.minPassengers }}</dd>

        <dt>Seats offered</dt>
        <dd>{{ launch.seatsOffered }}</dd>

        <dt>Seats available</dt>
        <dd>{{ launch.seatsAvailable }}</dd>
      </dl>
    </article>
  </section>
</template>

<style scoped>
.back {
  margin-bottom: 0.5rem;
}

.back a {
  color: var(--accent);
  text-decoration: none;
}

.back a:hover {
  text-decoration: underline;
}

.sold-out-badge {
  display: inline-block;
  padding: 0.15rem 0.6rem;
  border-radius: 999px;
  font-weight: 600;
  color: #c0392b;
  background: rgba(192, 57, 43, 0.1);
}

.detail-grid {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 0.5rem 1.5rem;
  margin-top: 1rem;
}

.detail-grid dt {
  color: var(--text-h);
  font-weight: 600;
}

.detail-grid dd {
  margin: 0;
}
</style>
