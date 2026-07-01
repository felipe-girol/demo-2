<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import EmptyState from '../components/EmptyState.vue'
import ErrorState from '../components/ErrorState.vue'
import LoadingState from '../components/LoadingState.vue'
import LaunchForm from '../components/LaunchForm.vue'
import LaunchList from '../components/LaunchList.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import { useAsync } from '../composables/use-async'
import type { ApiError, ApiResult } from '../types/api.type'
import type { CreateLaunchDto, Launch } from '../types/launch.type'
import type { Rocket } from '../types/rocket.type'
import { createLaunch, deleteLaunch, listLaunches, updateLaunch } from '../services/launches-api'
import { listRockets } from '../services/rockets-api'

/** Combined payload so launches and rockets share one loading/error cycle. */
type LaunchesData = { launches: Launch[]; rockets: Rocket[] }

/** Load launches and rockets together; surface the first failure as the error. */
async function loadLaunchesData(): Promise<ApiResult<LaunchesData>> {
  const [launchesResult, rocketsResult] = await Promise.all([listLaunches(), listRockets()])
  if (!launchesResult.ok) return launchesResult
  if (!rocketsResult.ok) return rocketsResult
  return { ok: true, data: { launches: launchesResult.data, rockets: rocketsResult.data } }
}

const { data, error, loading, run, retry } = useAsync<LaunchesData>()

const launches = computed<Launch[]>(() => data.value?.launches ?? [])
const rockets = computed<Rocket[]>(() => data.value?.rockets ?? [])

type FormMode = { kind: 'hidden' } | { kind: 'create' } | { kind: 'edit'; launch: Launch }
const formMode = ref<FormMode>({ kind: 'hidden' })
const submitting = ref(false)
const formError = ref<ApiError | null>(null)

const pendingDelete = ref<Launch | null>(null)
const deleting = ref(false)
const deleteError = ref<ApiError | null>(null)

const successMessage = ref<string | null>(null)

const editingLaunch = computed(() =>
  formMode.value.kind === 'edit' ? formMode.value.launch : null,
)

const deleteMessage = computed(() =>
  pendingDelete.value
    ? `Delete launch "${pendingDelete.value.mission}"? This cannot be undone.`
    : '',
)

function load(): Promise<void> {
  return run(loadLaunchesData)
}

onMounted(load)

function flashSuccess(message: string): void {
  successMessage.value = message
}

function openCreate(): void {
  formError.value = null
  formMode.value = { kind: 'create' }
}

function openEdit(launch: Launch): void {
  formError.value = null
  formMode.value = { kind: 'edit', launch }
}

function closeForm(): void {
  formMode.value = { kind: 'hidden' }
  formError.value = null
}

function replaceLaunches(next: Launch[]): void {
  if (data.value) data.value = { ...data.value, launches: next }
}

async function onFormSubmit(dto: CreateLaunchDto): Promise<void> {
  const mode = formMode.value
  if (mode.kind === 'hidden') return

  submitting.value = true
  formError.value = null
  successMessage.value = null

  const result =
    mode.kind === 'create'
      ? await createLaunch(dto)
      : await updateLaunch(mode.launch.id, dto)

  submitting.value = false

  if (!result.ok) {
    // Keep the form open and its values intact for correction.
    formError.value = result.error
    return
  }

  const saved = result.data
  const current = launches.value
  if (mode.kind === 'create') {
    replaceLaunches([...current, saved])
    flashSuccess(`Launch "${saved.mission}" scheduled.`)
  } else {
    replaceLaunches(current.map((l) => (l.id === saved.id ? saved : l)))
    flashSuccess(`Launch "${saved.mission}" updated.`)
  }
  closeForm()
}

function requestDelete(launch: Launch): void {
  deleteError.value = null
  pendingDelete.value = launch
}

function cancelDelete(): void {
  pendingDelete.value = null
  deleteError.value = null
}

async function confirmDelete(): Promise<void> {
  const launch = pendingDelete.value
  if (!launch) return

  deleting.value = true
  deleteError.value = null
  successMessage.value = null

  const result = await deleteLaunch(launch.id)
  deleting.value = false

  if (!result.ok) {
    deleteError.value = result.error
    return
  }

  replaceLaunches(launches.value.filter((l) => l.id !== launch.id))
  flashSuccess(`Launch "${launch.mission}" deleted.`)
  pendingDelete.value = null
}
</script>

<template>
  <section aria-labelledby="launches-h">
    <div class="header">
      <h1 id="launches-h">Launches</h1>
      <button
        v-if="formMode.kind === 'hidden'"
        type="button"
        class="primary"
        @click="openCreate"
      >
        New launch
      </button>
    </div>

    <p v-if="successMessage" class="success" role="status" aria-live="polite">
      {{ successMessage }}
    </p>

    <LaunchForm
      v-if="formMode.kind !== 'hidden'"
      :key="editingLaunch?.id ?? 'create'"
      :launch="editingLaunch"
      :rockets="rockets"
      :submitting="submitting"
      @submit="onFormSubmit"
      @cancel="closeForm"
    />

    <p v-if="formError" class="form-error" role="alert">
      {{ formError.message }}
    </p>

    <LoadingState v-if="loading" label="Loading launches…" />
    <ErrorState v-else-if="error" :message="error.message" @retry="retry" />
    <EmptyState
      v-else-if="launches.length === 0"
      message="No launches yet. Schedule your first launch to get started."
    />
    <LaunchList
      v-else
      :launches="launches"
      :rockets="rockets"
      @edit="openEdit"
      @delete="requestDelete"
    />

    <ConfirmDialog
      v-if="pendingDelete"
      title="Delete launch"
      :message="deleteMessage"
      confirm-label="Delete"
      :busy="deleting"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />
    <p v-if="deleteError" class="form-error" role="alert">
      {{ deleteError.message }}
    </p>
  </section>
</template>

<style scoped>
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.primary {
  font: inherit;
  cursor: pointer;
  padding: 0.45rem 1rem;
  border-radius: 6px;
  border: 1px solid var(--accent-border);
  color: var(--bg);
  background: var(--accent);
  transition: box-shadow 0.2s;
}

.primary:hover {
  box-shadow: var(--shadow);
}

.primary:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.success {
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  color: #1e7e34;
  background: rgba(30, 126, 52, 0.1);
}

.form-error {
  color: #c0392b;
}
</style>
