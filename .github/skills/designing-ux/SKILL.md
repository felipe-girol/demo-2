---
name: designing-ux
description: >
  Use when building or reviewing any user-facing UI flow in the AstroBookings frontend
  (forms, lists, async data, actions) and you need to decide which states to handle,
  how to give feedback, recover from errors, keep it accessible, and write clear microcopy.
  Apply before considering a component "done".
---

# Designing the User Experience

Good UX is about what happens **around** the happy path: every async call, every input, every action has waiting, empty, error, and success states a real user will hit. This skill is the *judgment layer* — what to handle and why. For Vue structure use `coding-vue-frontend`; for CoreUI components use `styling-coreui`.

## When to Use

- Building or reviewing forms, lists, detail views, or any action button that triggers async work
- Deciding which states a screen must handle and how to communicate them
- Before marking any user-facing component complete (run the self-review checklist)

When NOT to use: backend logic (`coding-express-api`), pure TS style (`coding-typescript`). This skill assumes you also apply `coding-vue-frontend` + `styling-coreui`.

## Core Principle

**An interaction is not done until its loading, empty, error, and success states are designed — and a keyboard-only or screen-reader user can complete it.** The happy path is the smallest part of the work.

## The Four States (handle ALL of them)

Every screen that loads data or runs an async action must explicitly handle:

| State | What the user sees | Common miss |
|-------|--------------------|-------------|
| **Loading** | Spinner/skeleton + `aria-busy`, ideally non-blocking | Layout shift; no SR announcement |
| **Empty** | Friendly "nothing here yet" + next action | Showing a blank screen |
| **Error** | What failed, in plain words, **+ a Retry control** | Dead-end error with no recovery |
| **Success** | Confirmation, then clear the form / update the view | Silent success; user unsure it worked |

Error states **must offer recovery** — a Retry button (re-call `load`) or a way to fix input. An error with no way forward is a dead end.

## Accessibility Essentials (non-negotiable)

- **Announce async changes**: wrap status in a live region so screen readers hear loading→done/error. Use `role="status"` (polite) for info/success, `role="alert"` (assertive) for errors. A static spinner alone is silent to SR users.
- **Manage focus**: after submit, move focus to the result (success/error) or the first invalid field. After deleting a row, move focus to a sensible neighbor — never leave focus on a vanished element.
- **Labels**: every input needs an associated `<CFormLabel for>` (not placeholder-as-label). Link errors via `aria-describedby`.
- **Semantic HTML**: real headings, `<button>` for actions, list/`<article>` for items — not `<div>`+`<br>` for layout.
- **Keyboard**: everything clickable must be reachable and operable by keyboard; visible focus ring stays.

## Validation & Feedback UX

- **Validate on the right beat**: don't show errors before the user has interacted. Track a `touched` (blur) or submit-attempted flag; show field errors only after that.
- **Disable, don't fail**: if an action can't succeed (sold-out launch, empty form, in-flight request), disable the control and say why — don't let the user submit a doomed request.
- **Prevent double submit**: disable the submit button while the request is in flight; show progress on it.
- **Microcopy**: errors say what happened AND how to fix it. "Only 3 seats are available" beats "Invalid input". Avoid blame and jargon.

## Destructive / Irreversible Actions

Cancellations, deletes, and payments need a confirmation step (CoreUI `CModal`) before firing. Make the confirm button's label specific ("Cancel booking", not "OK"). Never auto-fire an irreversible action on a single stray click.

## Example: states + a11y done right

Targets the exact gaps a quick implementation misses — live region, retry, focus, disabled affordance.

```vue
<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { CAlert, CButton, CSpinner } from '@coreui/vue';
import { useLaunches } from '../composables/use-launches';

const { launches, loading, error, load } = useLaunches();
const heading = ref<HTMLElement | null>(null);

onMounted(load);
</script>

<template>
  <section aria-labelledby="launches-h" aria-busy="loading">
    <h1 id="launches-h" ref="heading" tabindex="-1">Launches</h1>

    <!-- Live region: announces every async transition to screen readers -->
    <p role="status" class="visually-hidden">
      {{ loading ? 'Loading launches' : error ? 'Failed to load' : `${launches.length} launches` }}
    </p>

    <CSpinner v-if="loading" aria-hidden="true" />

    <!-- Error is NOT a dead end: offer recovery -->
    <CAlert v-else-if="error" color="danger" role="alert">
      {{ error }}
      <CButton color="danger" variant="outline" size="sm" class="ms-2" @click="load">
        Retry
      </CButton>
    </CAlert>

    <CAlert v-else-if="launches.length === 0" color="info" role="status">
      No launches scheduled yet.
    </CAlert>

    <ul v-else class="list-unstyled">
      <li v-for="launch in launches" :key="launch.id">
        <article>
          <h2>{{ launch.mission }}</h2>
          <!-- Doomed action is disabled + explained, not silently failing -->
          <CButton
            color="primary"
            :disabled="launch.seatsAvailable <= 0"
            @click="$emit('book', launch)"
          >
            {{ launch.seatsAvailable > 0 ? 'Book' : 'Sold out' }}
          </CButton>
        </article>
      </li>
    </ul>
  </section>
</template>
```

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Only the happy path is built | Design loading / empty / error / success for every async flow |
| Error shown with no way out | Add a Retry button or a path to fix the input |
| Spinner with no announcement | Add a `role="status"` live region around the state text |
| Focus left on a removed element | Move focus to result, first error, or a neighbor |
| Placeholder used as the label | Real `<CFormLabel for>`; link errors with `aria-describedby` |
| Validation errors before interaction | Gate on `touched`/submit-attempted |
| Sold-out / impossible action stays clickable | Disable the control and label why |
| Irreversible action fires on one click | Confirm via `CModal` with a specific label |
| Hardcoded locale/currency | Drive `Intl` formatting from locale, don't assume USD |

## UX Self-Review Checklist (run before "done")

Do NOT report a component as solid until you can tick every box:

- [ ] Loading, empty, error, **and** success states all handled
- [ ] Every error offers recovery (retry / fixable input)
- [ ] Async transitions announced via a live region
- [ ] Focus moves sensibly after submit / delete / load
- [ ] All inputs have associated labels; errors linked with `aria-describedby`
- [ ] Impossible actions are disabled with a reason, not left to fail
- [ ] Submit is disabled while in flight (no double-submit)
- [ ] Irreversible actions are confirmed first
- [ ] Error microcopy says what happened and how to fix it
- [ ] Fully operable by keyboard with a visible focus ring

A confident "it looks solid" is not evidence. Walk the checklist.
