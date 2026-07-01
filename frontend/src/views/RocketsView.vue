<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import EmptyState from '../components/EmptyState.vue'
import ErrorState from '../components/ErrorState.vue'
import LoadingState from '../components/LoadingState.vue'
import RocketForm from '../components/RocketForm.vue'
import RocketList from '../components/RocketList.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import { useAsync } from '../composables/use-async'
import type { ApiError } from '../types/api.type'
import type { CreateRocketDto, Rocket } from '../types/rocket.type'
import {
  createRocket,
  deleteRocket,
  listRockets,
  updateRocket,
} from '../services/rockets-api'

const { data, error, loading, run, retry } = useAsync<Rocket[]>()

/** Local working copy so create/edit/delete mutate without a full refetch. */
const rockets = computed<Rocket[]>(() => data.value ?? [])

type FormMode = { kind: 'hidden' } | { kind: 'create' } | { kind: 'edit'; rocket: Rocket }
const formMode = ref<FormMode>({ kind: 'hidden' })
const submitting = ref(false)
const formError = ref<ApiError | null>(null)

const pendingDelete = ref<Rocket | null>(null)
const deleting = ref(false)
const deleteError = ref<ApiError | null>(null)

const successMessage = ref<string | null>(null)

const editingRocket = computed(() =>
  formMode.value.kind === 'edit' ? formMode.value.rocket : null,
)

const deleteMessage = computed(() =>
  pendingDelete.value
    ? `Delete rocket "${pendingDelete.value.name}"? This cannot be undone.`
    : '',
)

function load(): Promise<void> {
  return run(listRockets)
}

onMounted(load)

function flashSuccess(message: string): void {
  successMessage.value = message
}

function openCreate(): void {
  formError.value = null
  formMode.value = { kind: 'create' }
}

function openEdit(rocket: Rocket): void {
  formError.value = null
  formMode.value = { kind: 'edit', rocket }
}

function closeForm(): void {
  formMode.value = { kind: 'hidden' }
  formError.value = null
}

async function onFormSubmit(dto: CreateRocketDto): Promise<void> {
  const mode = formMode.value
  if (mode.kind === 'hidden') return

  submitting.value = true
  formError.value = null
  successMessage.value = null

  const result =
    mode.kind === 'create'
      ? await createRocket(dto)
      : await updateRocket(mode.rocket.id, dto)

  submitting.value = false

  if (!result.ok) {
    // Keep the form open and its values intact for correction.
    formError.value = result.error
    return
  }

  const saved = result.data
  const current = rockets.value
  if (mode.kind === 'create') {
    data.value = [...current, saved]
    flashSuccess(`Rocket "${saved.name}" created.`)
  } else {
    data.value = current.map((r) => (r.id === saved.id ? saved : r))
    flashSuccess(`Rocket "${saved.name}" updated.`)
  }
  closeForm()
}

function requestDelete(rocket: Rocket): void {
  deleteError.value = null
  pendingDelete.value = rocket
}

function cancelDelete(): void {
  pendingDelete.value = null
  deleteError.value = null
}

async function confirmDelete(): Promise<void> {
  const rocket = pendingDelete.value
  if (!rocket) return

  deleting.value = true
  deleteError.value = null
  successMessage.value = null

  const result = await deleteRocket(rocket.id)
  deleting.value = false

  if (!result.ok) {
    deleteError.value = result.error
    return
  }

  data.value = rockets.value.filter((r) => r.id !== rocket.id)
  flashSuccess(`Rocket "${rocket.name}" deleted.`)
  pendingDelete.value = null
}
</script>

<template>
  <section aria-labelledby="rockets-h">
    <div class="header">
      <h1 id="rockets-h">Rockets</h1>
      <button
        v-if="formMode.kind === 'hidden'"
        type="button"
        class="primary"
        @click="openCreate"
      >
        New rocket
      </button>
    </div>

    <p
      v-if="successMessage"
      class="success"
      role="status"
      aria-live="polite"
    >
      {{ successMessage }}
    </p>

    <RocketForm
      v-if="formMode.kind !== 'hidden'"
      :key="editingRocket?.id ?? 'create'"
      :rocket="editingRocket"
      :submitting="submitting"
      @submit="onFormSubmit"
      @cancel="closeForm"
    />

    <p v-if="formError" class="form-error" role="alert">
      {{ formError.message }}
    </p>

    <LoadingState v-if="loading" label="Loading rockets…" />
    <ErrorState
      v-else-if="error"
      :message="error.message"
      @retry="retry"
    />
    <EmptyState
      v-else-if="rockets.length === 0"
      message="No rockets yet. Create your first rocket to get started."
    />
    <RocketList
      v-else
      :rockets="rockets"
      @edit="openEdit"
      @delete="requestDelete"
    />

    <ConfirmDialog
      v-if="pendingDelete"
      title="Delete rocket"
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
