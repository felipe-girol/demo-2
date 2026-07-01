<script setup lang="ts">
import { computed, onMounted } from 'vue'
import EmptyState from '../components/EmptyState.vue'
import ErrorState from '../components/ErrorState.vue'
import LoadingState from '../components/LoadingState.vue'
import LaunchCatalogList from '../components/LaunchCatalogList.vue'
import { useAsync } from '../composables/use-async'
import type { ApiResult } from '../types/api.type'
import type { LaunchView } from '../types/launch.type'
import type { Rocket } from '../types/rocket.type'
import { listLaunches } from '../services/launches-api'
import { listRockets } from '../services/rockets-api'

/** Combined payload so launches and rockets share one loading/error cycle. */
type CatalogData = { launches: LaunchView[]; rockets: Rocket[] }

/** Load launches and rockets together; surface the first failure as the error. */
async function loadCatalog(): Promise<ApiResult<CatalogData>> {
  const [launchesResult, rocketsResult] = await Promise.all([listLaunches(), listRockets()])
  if (!launchesResult.ok) return launchesResult
  if (!rocketsResult.ok) return rocketsResult
  return { ok: true, data: { launches: launchesResult.data, rockets: rocketsResult.data } }
}

const { data, error, loading, run, retry } = useAsync<CatalogData>()

const launches = computed<LaunchView[]>(() => data.value?.launches ?? [])
const rockets = computed<Rocket[]>(() => data.value?.rockets ?? [])

onMounted(() => run(loadCatalog))
</script>

<template>
  <section aria-labelledby="catalog-h">
    <h1 id="catalog-h">Launch catalog</h1>
    <p class="intro">Browse upcoming launches and see how many seats are still available.</p>

    <LoadingState v-if="loading" label="Loading launches…" />
    <ErrorState v-else-if="error" :message="error.message" @retry="retry" />
    <EmptyState
      v-else-if="launches.length === 0"
      message="No launches are scheduled yet. Check back soon."
    />
    <LaunchCatalogList v-else :launches="launches" :rockets="rockets" />
  </section>
</template>

<style scoped>
.intro {
  color: var(--text);
}
</style>
