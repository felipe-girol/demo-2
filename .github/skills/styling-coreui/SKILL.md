---
name: styling-coreui
description: >
  Use when styling the Vue 3 frontend with CoreUI: building layouts, forms, tables, cards,
  buttons, alerts, modals or navigation, installing/configuring CoreUI, or applying its
  Bootstrap-based utility classes and color themes to the AstroBookings UI.
---

# Styling the Frontend with CoreUI

Style the Vue 3 frontend using **CoreUI for Vue.js** (`@coreui/vue`), a Bootstrap 5–compatible component library. Prefer CoreUI **components** (`CButton`, `CCard`, `CForm*`, `CTable`) for structure and CoreUI/Bootstrap **utility classes** for spacing and alignment. Keep component-specific tweaks in `<style scoped>`.

## When to Use

- Adding visual structure or theming to `.vue` components (layout, forms, tables, cards, nav)
- Installing or configuring CoreUI in the `frontend/` app
- Replacing hand-rolled CSS with CoreUI components/utilities

When NOT to use: Vue logic/state/API wiring (use `coding-vue-frontend`), backend work (`coding-express-api`), or pure TS style (`coding-typescript`).

## One-Time Setup

CoreUI is **not installed by default**. Install and import the CSS once.

```bash
cd frontend && npm install @coreui/vue @coreui/coreui
# Optional icons:
npm install @coreui/icons @coreui/icons-vue
```

Import the stylesheet once in `frontend/src/main.ts` (before app mount, after any reset):

```typescript
// frontend/src/main.ts
import { createApp } from 'vue';
import '@coreui/coreui/dist/css/coreui.min.css'; // CoreUI styles (global, import once)
import './style.css';                              // project overrides AFTER CoreUI
import App from './App.vue';

createApp(App).mount('#app');
```

Then import components **per-component, on demand** (enables tree-shaking) — never register globally.

```vue
<script setup lang="ts">
import { CButton, CCard, CCardBody } from '@coreui/vue';
</script>
```

## Core Rules

| Topic | Rule |
|-------|------|
| Import style | Named imports from `@coreui/vue`, per SFC. Never global `app.component` registration |
| Components first | Use `C*` components for structure; reach for raw HTML + classes only when no component fits |
| Layout | Wrap pages in `CContainer` → `CRow` → `CCol`; never hand-roll flex/grid CSS |
| Colors | Use the `color` prop (`primary`, `secondary`, `success`, `danger`, `warning`, `info`, `light`, `dark`) — not custom hex |
| Spacing | Use utility classes (`m-3`, `mt-2`, `px-4`, `gap-2`) instead of margins in `<style>` |
| Custom CSS | Only for what utilities/props can't express; keep it in `<style scoped>` |
| Icons | Render via `<CIcon :icon="cilStar" />` from `@coreui/icons-vue`; do not inline SVGs |

## Layout: Grid

```vue
<script setup lang="ts">
import { CContainer, CRow, CCol } from '@coreui/vue';
</script>

<template>
  <CContainer>
    <CRow class="g-3">
      <CCol :md="6" v-for="rocket in rockets" :key="rocket.id">
        <!-- card here -->
      </CCol>
    </CRow>
  </CContainer>
</template>
```

Breakpoint props (`:sm`, `:md`, `:lg`, `:xl`) take 1–12 column spans. Use `g-*` on `CRow` for gutters.

## Cards

```vue
<script setup lang="ts">
import { CCard, CCardHeader, CCardBody, CCardTitle, CButton } from '@coreui/vue';
</script>

<template>
  <CCard>
    <CCardHeader>{{ rocket.name }}</CCardHeader>
    <CCardBody>
      <CCardTitle>{{ rocket.range }}</CCardTitle>
      <p class="text-body-secondary">Capacity: {{ rocket.capacity }}</p>
      <CButton color="primary" @click="emit('select', rocket.id)">Book</CButton>
    </CCardBody>
  </CCard>
</template>
```

## Buttons

```vue
<CButton color="primary">Save</CButton>
<CButton color="danger" variant="outline" :disabled="loading">Delete</CButton>
<CButton color="secondary" size="sm">Cancel</CButton>
```

Key props: `color`, `variant` (`outline` | `ghost`), `size` (`sm` | `lg`), `disabled`, `shape`.

## Forms

Use `CForm` + `CFormLabel` / `CFormInput` / `CFormSelect`. Bind with `v-model`; show validation via the `invalid` / `valid` props.

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { CForm, CFormLabel, CFormInput, CFormSelect, CButton } from '@coreui/vue';

const email = ref('');
const range = ref('orbital');
const emailInvalid = ref(false);
</script>

<template>
  <CForm @submit.prevent="onSubmit">
    <CFormLabel for="email">Email</CFormLabel>
    <CFormInput
      id="email"
      type="email"
      v-model="email"
      :invalid="emailInvalid"
      feedback-invalid="Email is required"
    />

    <CFormLabel for="range" class="mt-3">Range</CFormLabel>
    <CFormSelect id="range" v-model="range" :options="['suborbital', 'orbital', 'moon', 'mars']" />

    <CButton type="submit" color="primary" class="mt-3">Create</CButton>
  </CForm>
</template>
```

## Tables

```vue
<script setup lang="ts">
import {
  CTable, CTableHead, CTableBody, CTableRow, CTableHeaderCell, CTableDataCell,
} from '@coreui/vue';
</script>

<template>
  <CTable hover responsive>
    <CTableHead>
      <CTableRow>
        <CTableHeaderCell>Name</CTableHeaderCell>
        <CTableHeaderCell>Seats</CTableHeaderCell>
      </CTableRow>
    </CTableHead>
    <CTableBody>
      <CTableRow v-for="launch in launches" :key="launch.id">
        <CTableDataCell>{{ launch.rocketName }}</CTableDataCell>
        <CTableDataCell>{{ launch.seatsOffered }}</CTableDataCell>
      </CTableRow>
    </CTableBody>
  </CTable>
</template>
```

## Feedback: Alerts, Badges, Spinners

```vue
<CAlert v-if="error" color="danger">{{ error }}</CAlert>
<CBadge color="success">Available</CBadge>
<CSpinner v-if="loading" color="primary" size="sm" />
```

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Writing custom flex/grid CSS | Use `CContainer`/`CRow`/`CCol` |
| Hardcoded hex colors | Use `color` prop or theme utility classes |
| Margins/padding in `<style>` | Use spacing utilities (`m-2`, `px-3`, `gap-2`) |
| Importing whole library globally | Named per-SFC imports for tree-shaking |
| Forgetting the CSS import | `coreui.min.css` must be imported once in `main.ts` |
| Mutating props for `v-model` | `v-model` on form inputs binds local refs, not props |
| Importing `coreui.min.css` after `style.css` | CoreUI first, project overrides after |

## Best Practices

1. **Components over raw markup** — let `C*` components carry structure and accessibility.
2. **Props/utilities over custom CSS** — only fall back to `<style scoped>` when nothing fits.
3. **Theme colors only** — stick to CoreUI's semantic color tokens for consistency.
4. **Per-SFC imports** — keep the bundle lean via tree-shaking.
5. Combine with `coding-vue-frontend` for component/state structure and `coding-typescript` for TS style.
