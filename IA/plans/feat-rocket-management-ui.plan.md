# Implementation Plan for feat-rocket-management-ui

Implements FR10 (Rocket management UI) per
[spec](specs/feat-rocket-management-ui.spec.md), the umbrella
[staged-delivery spec](specs/feat-frontend-staged-delivery.spec.md) Stage 2,
and the [ADD](ADD.md). Builds the Agency rocket-management screen on top of the
existing app shell (FR9): list, create, edit, and delete rockets through the
single typed `api-client` against `/api/rockets`, with inline name/range/
capacity validation feedback and the shared loading/empty/error states.

Scope is the frontend UI only. The rocket CRUD API (FR1) and its validation
rules (FR2) are already implemented and out of scope; the API stays the single
source of truth. No new persisted entities — `IA/ERM.md` is **unchanged** (the
`Rocket` entity already exists; the frontend only mirrors its DTOs and holds
ephemeral session state).

## Design decisions

- **Reuse the app shell, don't reinvent it**: drive all async UI through the
  existing `use-async` composable and `LoadingState` / `EmptyState` /
  `ErrorState` components; route through the existing `AgencyView`. No new
  shared primitives.
- **Single typed client on `/api`**: all four operations call
  `services/api-client.ts`; add a thin `services/rockets-api.ts` exposing
  `listRockets` / `createRocket` / `updateRocket` / `deleteRocket`, each
  returning the discriminated `ApiResult<T>`. Callers never see raw throws.
- **Frontend types mirror backend DTOs**: add `types/rocket.type.ts` with
  `Rocket`, `CreateRocketDto`, `UpdateRocketDto`, the `ROCKET_RANGES` tuple, and
  `MIN/MAX_CAPACITY`, mirroring `backend/src/types/rockets.type.ts`. No business
  rules are duplicated beyond client-side input validation for fast feedback.
- **Client validation mirrors, server stays authoritative**: a pure
  `validateRocketForm` helper reproduces the backend rules (non-empty `name`,
  `range` in the allowed set, integer `capacity` in `[1,10]`) to block invalid
  submits and show inline field errors; any server validation/error response is
  surfaced via the shared error state and treated as authoritative.
- **Surface server error detail**: extend the api-client to parse a JSON error
  body (e.g. `{ errors: string[] }` / `{ message }`) into `ApiError.message`
  instead of the generic `Request failed (status)`, so the error state and any
  preserved form keep a meaningful message. Backward compatible with existing
  callers.
- **Reused edit form, confirmed delete**: one `RocketForm` component serves both
  create (empty) and edit (pre-filled) via a `modelValue`/`rocket` prop; delete
  triggers a lightweight confirmation step before issuing `DELETE`. On API
  failure the entered form values are preserved.
- **Local list state, no global store**: `RocketsView` owns the rockets array
  and mutates it optimistically-after-success (append on create, replace on
  edit, remove on delete) to avoid a full refetch; a retry re-runs the loader.
  Pinia is not introduced (consistent with the shell's deferral).
- **Styling**: follow the shell's lightweight `<script setup lang="ts">` +
  `<style scoped>` + shared CSS variables pattern; apply `designing-ux` for
  states, feedback, accessibility, and microcopy. CoreUI adoption stays deferred
  unless a later stage pulls it in.
- **TypeScript / Vue**: follow `.claude/rules/ts.md`, `coding-typescript`, and
  `coding-vue-frontend`; SFCs use `<script setup lang="ts">` only.

## Target frontend structure (added/changed by this plan)

```text
frontend/src/
├── types/
│   └── rocket.type.ts            # (new) Rocket, Create/UpdateRocketDto, ranges, capacity bounds
├── services/
│   ├── api-client.ts             # (edit) parse server error body into ApiError.message
│   └── rockets-api.ts            # (new) list/create/update/delete rockets -> ApiResult<T>
├── validation/
│   └── rocket-form.ts            # (new) pure validateRocketForm() mirroring backend rules
├── components/
│   ├── RocketForm.vue            # (new) create/edit form with inline field errors
│   ├── RocketList.vue            # (new) table of rockets + per-row edit/delete actions
│   └── ConfirmDialog.vue         # (new, optional) reusable confirm step for delete
└── views/
    ├── AgencyView.vue            # (edit) link/host the rockets management screen
    └── RocketsView.vue           # (new) orchestrates list + form + delete via use-async
```

### Step 1: Frontend rocket types and API service
Mirror the backend DTOs and expose typed rocket operations through the client.
- [ ] Add `types/rocket.type.ts` mirroring `backend/src/types/rockets.type.ts` (`Rocket`, `CreateRocketDto`, `UpdateRocketDto`, `ROCKET_RANGES` `as const`, `MIN_CAPACITY`/`MAX_CAPACITY`).
- [ ] Add `services/rockets-api.ts` with `listRockets()`, `createRocket(dto)`, `updateRocket(id, dto)`, `deleteRocket(id)`, each delegating to `request<T>()` and returning `ApiResult<T>`.
- [ ] Use correct verbs/paths/bodies: `GET /rockets`, `POST /rockets`, `PUT /rockets/:id`, `DELETE /rockets/:id` (204 → `ApiResult<void>`), with `Content-Type: application/json` on writes.

### Step 2: Surface server error detail in the API client
Make validation/error responses meaningful without breaking existing callers.
- [ ] Extend `request<T>()` to read a non-2xx JSON body and map `errors: string[]` / `message` into `ApiError.message` (fall back to the current generic text).
- [ ] Keep network/timeout mapping (status 0) and the discriminated `ApiResult` contract intact.
- [ ] Update `services/api-client.test.ts` to cover error-body parsing alongside existing cases.

### Step 3: Client-side validation helper
Fast inline feedback that mirrors—but never replaces—the backend rules.
- [ ] Add `validation/rocket-form.ts` with a pure `validateRocketForm(input)` returning per-field messages (`name` non-empty, `range` in `ROCKET_RANGES`, `capacity` integer in `[MIN,MAX]`).
- [ ] Keep it dependency-free and reusable by the form for blur/submit validation.
- [ ] Add `validation/rocket-form.test.ts` (Vitest) covering valid input and each rule violation.

### Step 4: RocketForm component (create + edit)
One reusable form for both create and edit with inline field errors.
- [ ] Build `RocketForm.vue` (`<script setup lang="ts">`) with `name` text, `range` `<select>` limited to `ROCKET_RANGES`, and `capacity` number inputs; accept an optional `rocket` prop to pre-fill for edit.
- [ ] On submit, run `validateRocketForm`; if errors, show them next to the offending fields and emit nothing (no request); otherwise `emit('submit', dto)`.
- [ ] Preserve entered values on submit failure; expose `submitting`/`serverError` props so the parent can reflect API state; emit `cancel`.
- [ ] Apply `designing-ux` (labels, `aria-describedby` for errors, focus management, clear microcopy).

### Step 5: RocketList component
Display the fleet and expose per-row actions.
- [ ] Build `RocketList.vue` rendering a table of `name`, `range`, `capacity` with per-row Edit and Delete buttons.
- [ ] Emit `edit(rocket)` and `delete(rocket)` to the parent; keep it presentational (no data fetching).
- [ ] Ensure accessible table semantics and an empty-safe render (parent decides empty state).

### Step 6: RocketsView orchestration + delete confirmation
Wire list, form, and delete together via the shared async states.
- [ ] Build `RocketsView.vue` using `use-async` to load `listRockets()`; render `LoadingState` while loading, `ErrorState` (with retry) on failure, `EmptyState` when zero rockets, else `RocketList`.
- [ ] Manage create/edit mode with `RocketForm`; on successful create append, on edit replace, on delete remove from the local list; show success feedback (toast/inline) for each.
- [ ] Add a confirmation step before `deleteRocket` (inline confirm or `ConfirmDialog.vue`); on any API failure show the error state and preserve form input.
- [ ] Add a `/agency/rockets` route (or host within `AgencyView`) and link it from `AgencyView`; lazy-load the view in `router/index.ts`.

### Step 7: Verify and finalize
Typecheck, test, and confirm acceptance criteria end-to-end.
- [ ] `cd frontend && npm run test` (Vitest) green for the new validation/service tests; `npm run build` (`vue-tsc -b && vite build`) passes with no type errors.
- [ ] Manual check with backend running (`cd backend && npm run dev` + `cd frontend && npm run dev`): list loads, loading/empty/error+retry render, create/edit/delete reflect in the list, inline validation blocks bad input, range select is constrained, server errors preserve form values.
- [x] Add a Playwright E2E suite (`tests/frontend-rockets.spec.ts`) covering every acceptance criterion (load+list, loading, empty, create, edit, delete-confirm, client validation block, API error+retry+preserved values, constrained range).
- [ ] Update PRD FR10 status `NotStarted → InProgress`; set this spec status `Planned → InProgress` while building (Done on completion).

## Acceptance Criteria coverage

| Criterion (spec) | Step |
|---|---|
| On load, `GET /api/rockets` and show name/range/capacity | 1, 5, 6 |
| Loading state while the request is in progress | 6 |
| Empty state when no rockets exist | 6 |
| Valid create → `POST /api/rockets`, add to list | 1, 4, 6 |
| Edit submit → `PUT /api/rockets/:id`, reflect in list | 1, 4, 6 |
| Confirmed delete → `DELETE /api/rockets/:id`, remove from list | 1, 6 |
| Invalid input → inline field feedback, no request sent | 3, 4 |
| API error → shared error state w/ retry, preserve form values | 2, 4, 6 |
| Range input restricted to suborbital/orbital/moon/mars | 1, 4 |

## Out of scope / follow-ups

- Launch management UI (FR11) and customer/catalog/booking UIs (FR12–FR13) — later stages.
- CoreUI styling system adoption (`styling-coreui`) — still deferred.
- Pinia/global store — not needed; revisit if cross-route rocket state appears.
- Backend rocket API and validation (FR1/FR2) — already implemented, unchanged.
