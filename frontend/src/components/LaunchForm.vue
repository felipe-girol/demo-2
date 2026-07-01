<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import type { CreateLaunchDto, Launch } from '../types/launch.type'
import type { Rocket } from '../types/rocket.type'
import {
  isLaunchFormValid,
  validateLaunchForm,
  type LaunchFormErrors,
} from '../validation/launch-form'

const props = withDefaults(
  defineProps<{
    /** Rockets available for selection (populated from `/api/rockets`). */
    rockets: Rocket[]
    /** When present the form is in edit mode and pre-filled. */
    launch?: Launch | null
    /** Reflects an in-flight API request from the parent. */
    submitting?: boolean
  }>(),
  { launch: null, submitting: false },
)

const emit = defineEmits<{
  submit: [dto: CreateLaunchDto]
  cancel: []
}>()

type FormState = {
  rocketId: string
  mission: string
  date: string
  pricePerSeat: number | null
  minPassengers: number | null
  seatsOffered: number | null
}

/** Convert an ISO date string into a `datetime-local` input value. */
function toDateTimeLocal(iso: string | undefined): string {
  if (!iso) return ''
  const time = Date.parse(iso)
  if (Number.isNaN(time)) return ''
  const d = new Date(time)
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function initialState(): FormState {
  return {
    rocketId: props.launch?.rocketId ?? '',
    mission: props.launch?.mission ?? '',
    date: toDateTimeLocal(props.launch?.date),
    pricePerSeat: props.launch?.pricePerSeat ?? null,
    minPassengers: props.launch?.minPassengers ?? null,
    seatsOffered: props.launch?.seatsOffered ?? null,
  }
}

const form = reactive<FormState>(initialState())
const errors = ref<LaunchFormErrors>({})
const submitted = ref(false)

const isEdit = computed(() => props.launch !== null)
const heading = computed(() => (isEdit.value ? 'Edit launch' : 'New launch'))
const submitLabel = computed(() => (isEdit.value ? 'Save changes' : 'Schedule launch'))

// Re-seed the form when the edited launch changes (preserves values on failure
// because the parent keeps the same `launch` reference while submitting).
watch(
  () => props.launch,
  () => {
    Object.assign(form, initialState())
    errors.value = {}
    submitted.value = false
  },
)

function revalidate(): LaunchFormErrors {
  const next = validateLaunchForm(
    {
      rocketId: form.rocketId,
      mission: form.mission,
      date: form.date,
      pricePerSeat: form.pricePerSeat,
      minPassengers: form.minPassengers,
      seatsOffered: form.seatsOffered,
    },
    props.rockets,
  )
  errors.value = next
  return next
}

function onFieldBlur(): void {
  if (submitted.value) revalidate()
}

function onSubmit(): void {
  submitted.value = true
  const next = revalidate()
  if (!isLaunchFormValid(next)) return

  emit('submit', {
    rocketId: form.rocketId,
    mission: form.mission.trim(),
    date: new Date(form.date).toISOString(),
    pricePerSeat: form.pricePerSeat as number,
    minPassengers: form.minPassengers as number,
    seatsOffered: form.seatsOffered as number,
  })
}
</script>

<template>
  <form class="launch-form" novalidate @submit.prevent="onSubmit">
    <h2>{{ heading }}</h2>

    <div class="field">
      <label for="launch-rocket">Rocket</label>
      <select
        id="launch-rocket"
        v-model="form.rocketId"
        :aria-invalid="Boolean(errors.rocketId)"
        :aria-describedby="errors.rocketId ? 'launch-rocket-error' : undefined"
        @blur="onFieldBlur"
      >
        <option value="" disabled>Select a rocket…</option>
        <option v-for="rocket in rockets" :key="rocket.id" :value="rocket.id">
          {{ rocket.name }} (capacity {{ rocket.capacity }})
        </option>
      </select>
      <p v-if="errors.rocketId" id="launch-rocket-error" class="field-error" role="alert">
        {{ errors.rocketId }}
      </p>
    </div>

    <div class="field">
      <label for="launch-mission">Mission</label>
      <input
        id="launch-mission"
        v-model="form.mission"
        type="text"
        autocomplete="off"
        :aria-invalid="Boolean(errors.mission)"
        :aria-describedby="errors.mission ? 'launch-mission-error' : undefined"
        @blur="onFieldBlur"
      />
      <p v-if="errors.mission" id="launch-mission-error" class="field-error" role="alert">
        {{ errors.mission }}
      </p>
    </div>

    <div class="field">
      <label for="launch-date">Date</label>
      <input
        id="launch-date"
        v-model="form.date"
        type="datetime-local"
        :aria-invalid="Boolean(errors.date)"
        :aria-describedby="errors.date ? 'launch-date-error' : undefined"
        @blur="onFieldBlur"
      />
      <p v-if="errors.date" id="launch-date-error" class="field-error" role="alert">
        {{ errors.date }}
      </p>
    </div>

    <div class="field">
      <label for="launch-price">Price per seat</label>
      <input
        id="launch-price"
        v-model.number="form.pricePerSeat"
        type="number"
        min="0"
        step="0.01"
        :aria-invalid="Boolean(errors.pricePerSeat)"
        :aria-describedby="errors.pricePerSeat ? 'launch-price-error' : undefined"
        @blur="onFieldBlur"
      />
      <p v-if="errors.pricePerSeat" id="launch-price-error" class="field-error" role="alert">
        {{ errors.pricePerSeat }}
      </p>
    </div>

    <div class="field">
      <label for="launch-seats">Seats offered</label>
      <input
        id="launch-seats"
        v-model.number="form.seatsOffered"
        type="number"
        min="1"
        step="1"
        :aria-invalid="Boolean(errors.seatsOffered)"
        :aria-describedby="errors.seatsOffered ? 'launch-seats-error' : undefined"
        @blur="onFieldBlur"
      />
      <p v-if="errors.seatsOffered" id="launch-seats-error" class="field-error" role="alert">
        {{ errors.seatsOffered }}
      </p>
    </div>

    <div class="field">
      <label for="launch-min">Minimum passengers</label>
      <input
        id="launch-min"
        v-model.number="form.minPassengers"
        type="number"
        min="1"
        step="1"
        :aria-invalid="Boolean(errors.minPassengers)"
        :aria-describedby="errors.minPassengers ? 'launch-min-error' : undefined"
        @blur="onFieldBlur"
      />
      <p v-if="errors.minPassengers" id="launch-min-error" class="field-error" role="alert">
        {{ errors.minPassengers }}
      </p>
    </div>

    <div class="actions">
      <button type="submit" class="primary" :disabled="submitting">
        {{ submitting ? 'Saving…' : submitLabel }}
      </button>
      <button type="button" class="ghost" :disabled="submitting" @click="emit('cancel')">
        Cancel
      </button>
    </div>
  </form>
</template>

<style scoped>
.launch-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 28rem;
  padding: 1.25rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--social-bg);
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.field label {
  font-weight: 600;
  color: var(--text-h);
}

.field input,
.field select {
  font: inherit;
  padding: 0.45rem 0.6rem;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: var(--bg);
  color: var(--text-h);
}

.field input:focus-visible,
.field select:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}

.field [aria-invalid='true'] {
  border-color: #c0392b;
}

.field-error {
  margin: 0;
  font-size: 0.85rem;
  color: #c0392b;
}

.actions {
  display: flex;
  gap: 0.5rem;
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

.primary {
  border: 1px solid var(--accent-border);
  color: var(--bg);
  background: var(--accent);
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
