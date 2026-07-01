<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import {
  MAX_CAPACITY,
  MIN_CAPACITY,
  ROCKET_RANGES,
  type CreateRocketDto,
  type Rocket,
} from '../types/rocket.type'
import {
  isRocketFormValid,
  validateRocketForm,
  type RocketFormErrors,
} from '../validation/rocket-form'

const props = withDefaults(
  defineProps<{
    /** When present the form is in edit mode and pre-filled. */
    rocket?: Rocket | null
    /** Reflects an in-flight API request from the parent. */
    submitting?: boolean
  }>(),
  { rocket: null, submitting: false },
)

const emit = defineEmits<{
  submit: [dto: CreateRocketDto]
  cancel: []
}>()

type FormState = { name: string; range: string; capacity: number | null }

function initialState(): FormState {
  return {
    name: props.rocket?.name ?? '',
    range: props.rocket?.range ?? '',
    capacity: props.rocket?.capacity ?? null,
  }
}

const form = reactive<FormState>(initialState())
const errors = ref<RocketFormErrors>({})
const submitted = ref(false)

const isEdit = computed(() => props.rocket !== null)
const heading = computed(() => (isEdit.value ? 'Edit rocket' : 'New rocket'))
const submitLabel = computed(() => (isEdit.value ? 'Save changes' : 'Create rocket'))

// Re-seed the form when the edited rocket changes (preserves values on failure
// because the parent keeps the same `rocket` reference while submitting).
watch(
  () => props.rocket,
  () => {
    Object.assign(form, initialState())
    errors.value = {}
    submitted.value = false
  },
)

function revalidate(): RocketFormErrors {
  const next = validateRocketForm({
    name: form.name,
    range: form.range,
    capacity: form.capacity,
  })
  errors.value = next
  return next
}

function onFieldBlur(): void {
  if (submitted.value) revalidate()
}

function onSubmit(): void {
  submitted.value = true
  const next = revalidate()
  if (!isRocketFormValid(next)) return

  emit('submit', {
    name: form.name.trim(),
    range: form.range as CreateRocketDto['range'],
    capacity: form.capacity as number,
  })
}
</script>

<template>
  <form class="rocket-form" novalidate @submit.prevent="onSubmit">
    <h2>{{ heading }}</h2>

    <div class="field">
      <label for="rocket-name">Name</label>
      <input
        id="rocket-name"
        v-model="form.name"
        type="text"
        autocomplete="off"
        :aria-invalid="Boolean(errors.name)"
        :aria-describedby="errors.name ? 'rocket-name-error' : undefined"
        @blur="onFieldBlur"
      />
      <p v-if="errors.name" id="rocket-name-error" class="field-error" role="alert">
        {{ errors.name }}
      </p>
    </div>

    <div class="field">
      <label for="rocket-range">Range</label>
      <select
        id="rocket-range"
        v-model="form.range"
        :aria-invalid="Boolean(errors.range)"
        :aria-describedby="errors.range ? 'rocket-range-error' : undefined"
        @blur="onFieldBlur"
      >
        <option value="" disabled>Select a range…</option>
        <option v-for="range in ROCKET_RANGES" :key="range" :value="range">
          {{ range }}
        </option>
      </select>
      <p v-if="errors.range" id="rocket-range-error" class="field-error" role="alert">
        {{ errors.range }}
      </p>
    </div>

    <div class="field">
      <label for="rocket-capacity">Capacity</label>
      <input
        id="rocket-capacity"
        v-model.number="form.capacity"
        type="number"
        :min="MIN_CAPACITY"
        :max="MAX_CAPACITY"
        step="1"
        :aria-invalid="Boolean(errors.capacity)"
        :aria-describedby="errors.capacity ? 'rocket-capacity-error' : undefined"
        @blur="onFieldBlur"
      />
      <p
        v-if="errors.capacity"
        id="rocket-capacity-error"
        class="field-error"
        role="alert"
      >
        {{ errors.capacity }}
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
.rocket-form {
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
