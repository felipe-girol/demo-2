# Implementation Plan for feat-launch-management-ui

Implements FR11 (Launch management UI) per
[spec](specs/feat-launch-management-ui.spec.md) and the [ADD](ADD.md). Builds the
Agency launch-scheduling screen on top of the existing app shell (FR9) and the
rocket-management UI (FR10): list, create, edit, and delete launches through the
single typed `api-client` against `/api/launches`, with rocket selection from
`/api/rockets`, inline per-field validation feedback mirroring backend rules
(FR5), and the shared loading/empty/error states plus confirmed delete.

Scope is the frontend UI only. The launch CRUD API (FR4) and its validation
rules (FR5) are already implemented and out of scope; the API stays the single
source of truth. No new persisted entities — `IA/ERM.md` is **unchanged** (the
`Launch` entity already exists; the frontend only mirrors its DTOs and holds
ephemeral session state).

## Design decisions

- **Reuse the FR10 rocket-UI pattern**: mirror the existing
  `rockets-api` / `rocket-form` / `RocketForm` / `RocketList` / `RocketsView`
  structure for launches; no new shared primitives. Drive all async UI through
  the existing `use-async` composable and `LoadingState` / `EmptyState` /
  `ErrorState` components, and reuse the existing `ConfirmDialog` for delete.
- **Single typed client on `/api`**: all four operations call
  `services/api-client.ts` via a thin `services/launches-api.ts`
  (`listLaunches` / `createLaunch` / `updateLaunch` / `deleteLaunch`), each
  returning the discriminated `ApiResult<T>`. Reuse the existing `listRockets()`
  from `services/rockets-api.ts` to populate the rocket selector.
- **Frontend types mirror backend DTOs**: add `types/launch.type.ts` with
  `Launch`, `CreateLaunchDto`, `UpdateLaunchDto`, mirroring
  `backend/src/types/launches.type.ts`. No business rules are duplicated beyond
  client-side input validation for fast feedback.
- **Client validation mirrors, server stays authoritative**: a pure
  `validateLaunchForm` helper reproduces the backend rules (FR5) — `rocketId`
  references a known rocket, integer `seatsOffered ≤` selected rocket capacity,
  integer `minPassengers ≤ seatsOffered`, future `date`, non-empty `mission`,
  positive `pricePerSeat` — to block invalid submits and show inline field
  errors. The validator receives the loaded rockets so it can resolve capacity.
  Any server validation/error response is surfaced and treated as authoritative.
- **Rocket resolution for display + validation**: `LaunchesView` loads rockets
  alongside launches; the list resolves each launch's `rocketId` to the rocket
  name, and the form passes the selected rocket's capacity into the validator.
  A missing/stale `rocketId` degrades gracefully (e.g. shows the raw id).
- **Reused edit form, confirmed delete**: one `LaunchForm` component serves both
  create (empty) and edit (pre-filled) via an optional `launch` prop; delete
  triggers the shared `ConfirmDialog` before issuing `DELETE`. On API failure the
  entered form values are preserved.
- **Local list state, no global store**: `LaunchesView` owns the launches array
  and mutates it after success (append on create, replace on edit, remove on
  delete) to avoid a full refetch; retry re-runs the loader. Pinia stays
  deferred, consistent with the shell and FR10.
- **Styling**: follow the shell/FR10 lightweight `<script setup lang="ts">` +
  `<style scoped>` + shared CSS variables pattern; apply `designing-ux` for
  states, feedback, accessibility, and microcopy. CoreUI adoption stays deferred.
- **TypeScript / Vue**: follow `.claude/rules/ts.md`, `coding-typescript`, and
  `coding-vue-frontend`; SFCs use `<script setup lang="ts">` only.

## Target frontend structure (added/changed by this plan)

```text
frontend/src/
├── types/
│   └── launch.type.ts            # (new) Launch, Create/UpdateLaunchDto
├── services/
│   └── launches-api.ts           # (new) list/create/update/delete launches -> ApiResult<T>
├── validation/
│   └── launch-form.ts            # (new) pure validateLaunchForm() mirroring backend FR5 rules
├── components/
│   ├── LaunchForm.vue            # (new) create/edit form: rocket select + fields + inline errors
│   └── LaunchList.vue            # (new) table of launches (rocket name) + per-row edit/delete
└── views/
    ├── AgencyView.vue            # (edit) add a link to the launches screen
    └── LaunchesView.vue          # (new) orchestrates list + form + delete via use-async
```

### Step 1: Frontend launch types and API service
Mirror the backend DTOs and expose typed launch operations through the client.
- [ ] Add `types/launch.type.ts` mirroring `backend/src/types/launches.type.ts` (`Launch`, `CreateLaunchDto`, `UpdateLaunchDto`).
- [ ] Add `services/launches-api.ts` with `listLaunches()`, `createLaunch(dto)`, `updateLaunch(id, dto)`, `deleteLaunch(id)`, each delegating to `request<T>()` and returning `ApiResult<T>`.
- [ ] Use correct verbs/paths/bodies: `GET /launches`, `POST /launches`, `PUT /launches/:id`, `DELETE /launches/:id` (204 → `ApiResult<void>`), with `Content-Type: application/json` on writes.

### Step 2: Client-side launch validation helper
Fast inline feedback that mirrors—but never replaces—the backend FR5 rules.
- [ ] Add `validation/launch-form.ts` with a pure `validateLaunchForm(input, rockets)` returning per-field messages: `rocketId` in known rockets, `mission` non-empty, future `date`, positive `pricePerSeat`, integer `seatsOffered ≤` selected rocket capacity, integer `minPassengers ≤ seatsOffered`.
- [ ] Keep it dependency-free (accept the rockets list as an argument) and reusable by the form for blur/submit validation; export an `isLaunchFormValid` guard.
- [ ] Add `validation/launch-form.test.ts` (Vitest) covering valid input and each rule violation, including the capacity/threshold cross-field cases.

### Step 3: LaunchForm component (create + edit)
One reusable form for both create and edit with rocket selection and inline errors.
- [ ] Build `LaunchForm.vue` (`<script setup lang="ts">`) with a `rocket` `<select>` (populated from a `rockets` prop, shown by name), `mission` text, `date` datetime input, `pricePerSeat` number, `minPassengers` number, `seatsOffered` number; accept an optional `launch` prop to pre-fill for edit.
- [ ] On submit, run `validateLaunchForm`; if errors, show them next to the offending fields and emit nothing (no request); otherwise `emit('submit', dto)`.
- [ ] Preserve entered values on submit failure; expose `submitting`/`serverError` props so the parent can reflect API state; emit `cancel`.
- [ ] Apply `designing-ux` (labels, `aria-describedby` for errors, focus management, clear microcopy).

### Step 4: LaunchList component
Display the launch program and expose per-row actions.
- [ ] Build `LaunchList.vue` rendering a table of `mission`, rocket name (resolved from a `rockets` prop / map), `date`, `pricePerSeat`, `minPassengers`, `seatsOffered` with per-row Edit and Delete buttons.
- [ ] Emit `edit(launch)` and `delete(launch)` to the parent; keep it presentational (no data fetching); degrade gracefully when a `rocketId` has no matching rocket.
- [ ] Ensure accessible table semantics and an empty-safe render (parent decides empty state).

### Step 5: LaunchesView orchestration + delete confirmation
Wire list, form, rocket loading, and delete together via the shared async states.
- [ ] Build `LaunchesView.vue` using `use-async` to load launches and rockets (`listLaunches()` + `listRockets()`); render `LoadingState` while loading, `ErrorState` (with retry) on failure, `EmptyState` when zero launches, else `LaunchList`.
- [ ] Manage create/edit mode with `LaunchForm` (pass the loaded rockets); on successful create append, on edit replace, on delete remove from the local list; show success feedback for each.
- [ ] Add a confirmation step before `deleteLaunch` via the existing `ConfirmDialog`; on any API failure show the error/serverError and preserve form input.
- [ ] Add a `/agency/launches` route, lazy-loaded in `router/index.ts`, and link it from `AgencyView.vue`.

### Step 6: Verify and finalize
Typecheck, test, and confirm acceptance criteria end-to-end.
- [ ] `cd frontend && npm run test` (Vitest) green for the new validation/service tests; `npm run build` (`vue-tsc -b && vite build`) passes with no type errors.
- [ ] Manual check with backend running (`cd backend && npm run dev` + `cd frontend && npm run dev`): list loads with rocket names, loading/empty/error+retry render, rocket selector populated, create/edit/delete reflect in the list, inline validation blocks bad input (capacity/threshold/future-date), server errors preserve form values.
- [x] Add a Playwright E2E suite (`tests/frontend-launches.spec.ts`) covering every acceptance criterion (load+list with rocket names, loading, empty, rocket-select populated, create, edit, delete-confirm, client validation block, API error+retry+preserved values).
- [ ] Update PRD FR11 status `NotStarted → InProgress`; set this spec status `Planned → InProgress` while building (Done on completion).

## Acceptance Criteria coverage

| Criterion (spec) | Step |
|---|---|
| On open, `GET /api/launches` and show mission/rocket name/date/price/minPassengers/seatsOffered | 1, 4, 5 |
| Loading state while the launches request is in progress | 5 |
| Error state with retry on launches request failure | 5 |
| Empty state when no launches exist | 5 |
| Form offers rocket selection populated from `/api/rockets` | 1, 3, 5 |
| Invalid field → field-specific messages, form not submitted | 2, 3 |
| Valid create → `POST /api/launches`, show in list | 1, 3, 5 |
| Valid edit → `PUT /api/launches/:id`, reflect updated values | 1, 3, 5 |
| Confirmed delete → `DELETE /api/launches/:id`, remove from list | 1, 5 |

## Out of scope / follow-ups

- Customer catalog/booking UIs (FR12–FR13) — later stages.
- CoreUI styling system adoption (`styling-coreui`) — still deferred.
- Pinia/global store — not needed; revisit if cross-route launch state appears.
- Backend launch API and validation (FR4/FR5) — already implemented, unchanged.
- `IA/ERM.md` — unchanged; no new persisted entities introduced.
