---
name: coding-vue-frontend
description: >
  Use when building or modifying the Vue 3 + Vite frontend: creating components, composables,
  API calls, reactive state, props/emits, or routing for the AstroBookings UI.
---

# Writing Vue 3 Frontend Code

Build the UI with **Vue 3 Composition API** using `<script setup lang="ts">` Single File Components (SFCs). Keep components small and presentational; push reusable logic into composables and API access into a typed service layer.

## When to Use

- Creating or editing `.vue` components, composables, or frontend services
- Wiring the UI to the Express API (`http://localhost:3000/api`)
- Managing reactive state, props, emits, or derived values

When NOT to use: backend Express work (use `coding-express-api`), or pure TS style questions (use `coding-typescript`).

## Folder Structure

Organize `frontend/src/` by responsibility:

```
src/
├── main.ts              # App bootstrap (createApp + mount)
├── App.vue              # Root component
├── components/          # Reusable presentational components (PascalCase.vue)
├── views/               # Route-level / page components (when routing exists)
├── composables/         # Reusable reactive logic (use-*.ts)
├── services/            # API access, typed fetch wrappers (*.service.ts)
└── types/               # Shared DTOs/entities (*.type.ts)
```

## Single File Component Structure

Always order blocks: `<script setup>` → `<template>` → `<style scoped>`.

```vue
<script setup lang="ts">
import { ref, computed } from 'vue';
import type { Rocket } from '../types/rocket.type';

const props = defineProps<{ rocket: Rocket }>();
const emit = defineEmits<{ select: [id: string] }>();

const isLarge = computed(() => props.rocket.capacity > 5);
</script>

<template>
  <article class="rocket-card" @click="emit('select', rocket.id)">
    <h3>{{ rocket.name }}</h3>
    <span v-if="isLarge">Large capacity</span>
  </article>
</template>

<style scoped>
.rocket-card {
  cursor: pointer;
}
</style>
```

## Core Rules

| Topic | Rule |
|-------|------|
| API style | `<script setup lang="ts">` only — never Options API |
| Component names | Multi-word PascalCase files: `RocketCard.vue`, not `Card.vue` |
| Props | Typed via generic `defineProps<{...}>()`; use `withDefaults` for defaults |
| Emits | Typed via `defineEmits<{...}>()`; never mutate props |
| Reactivity | `ref` for values, `computed` for derived state, `watch` only for side effects |
| Lists | `v-for` always needs `:key`; never combine `v-if` and `v-for` on one element |
| Styles | Prefer `<style scoped>` to avoid global leakage |
| Composables | Name `useThing()`, return refs/computed, keep framework-agnostic logic out |

## Reactivity Patterns

- `ref()` for primitives and objects you reassign; access value in script with `.value`, auto-unwrapped in template.
- `computed()` for values derived from other state — never duplicate state.
- `watch()` / `watchEffect()` only for side effects (fetching, logging), not for deriving values.
- Keep refs minimal; derive everything else.

## API Access via Services

Centralize HTTP in `services/*.service.ts`. Components and composables call services, never `fetch` inline.

```typescript
// services/rocket.service.ts
import type { Rocket } from '../types/rocket.type';

const API = 'http://localhost:3000/api';

export async function fetchRockets(): Promise<Rocket[]> {
  const res = await fetch(`${API}/rockets`);
  if (!res.ok) throw new Error(`Failed to load rockets: ${res.status}`);
  return res.json();
}
```

## Composables for Async State

Wrap loading/error/data state in a composable so components stay declarative.

```typescript
// composables/use-rockets.ts
import { ref } from 'vue';
import type { Rocket } from '../types/rocket.type';
import { fetchRockets } from '../services/rocket.service';

export function useRockets() {
  const rockets = ref<Rocket[]>([]);
  const error = ref<string | null>(null);
  const loading = ref(false);

  async function load(): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      rockets.value = await fetchRockets();
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error';
    } finally {
      loading.value = false;
    }
  }

  return { rockets, error, loading, load };
}
```

Consume it cleanly:

```vue
<script setup lang="ts">
import { onMounted } from 'vue';
import { useRockets } from '../composables/use-rockets';

const { rockets, error, loading, load } = useRockets();
onMounted(load);
</script>

<template>
  <p v-if="loading">Loading…</p>
  <p v-else-if="error">{{ error }}</p>
  <ul v-else>
    <li v-for="rocket in rockets" :key="rocket.id">{{ rocket.name }}</li>
  </ul>
</template>
```

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Mutating a prop | Emit an event; let the parent own the state |
| `fetch` inside a component | Move to a service; call via composable |
| `watch` to compute a value | Use `computed` instead |
| Missing `:key` in `v-for` | Always bind a stable unique key |
| Single-word component name | Use multi-word PascalCase |
| Forgetting `.value` in script | Refs need `.value`; templates auto-unwrap |
| Untyped props/emits | Use generic `defineProps`/`defineEmits` with TS types |

## Best Practices

1. **Composition API + `<script setup lang="ts">`** everywhere.
2. **One responsibility per component**; extract logic to composables.
3. **Derive, don't duplicate** — prefer `computed` over extra refs.
4. **Type everything** — share DTOs from `types/*.type.ts`, mirror backend contracts.
5. **Centralize HTTP** in services; handle loading/error states explicitly.
6. **Scoped styles** by default.
7. Follow `.claude/rules/ts.md` and `coding-typescript` for TS style.
