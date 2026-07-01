# Implementation Plan for feat-launch-catalog-browsing

Implements FR12 (Launch catalog and availability browsing) per
[spec](specs/feat-launch-catalog-browsing.spec.md) and the [ADD](ADD.md). Adds a
customer-facing, read-only catalog that lists the launch program from
`/api/launches` (mission, rocket name, date, price per seat, remaining seats)
with a sold-out indicator, plus a launch detail view at `/customer/launches/:id`.
A small backend enhancement extends the launch read responses with a derived,
read-only `seatsAvailable` field so availability is served by the API and never
recomputed in the frontend.

Scope spans a thin backend read enhancement (FR4/FR7) and the frontend customer
catalog/detail UI. Booking actions are FR13 and out of scope. No new persisted
entities are introduced — `seatsAvailable` is **derived** (seats offered minus
seats booked) via the existing `bookings.service.getRemainingSeats`, so
`IA/ERM.md` is **unchanged**.

## Design decisions

- **API stays the single source of truth**: remaining availability is computed
  server-side on read and exposed as `seatsAvailable`; the frontend never
  re-derives it (project rule: no business rules duplicated client-side).
- **Derived, not stored**: `seatsAvailable = seatsOffered − booked seats`, reusing
  `getRemainingSeats` (ADR 3). The field is read-only — computed only on
  `GET /api/launches` and `GET /api/launches/:id`, never accepted on
  create/update and never persisted, so the `Launch` entity and `IA/ERM.md` are
  unchanged.
- **Backend mapping in the launches layer**: add a `LaunchView = Launch &
  { seatsAvailable }` read type and a small `withAvailability(launch)` helper in
  `launches.service.ts` that calls `bookings.service.getRemainingSeats`; the two
  GET routes map their results through it. Create/update responses are unchanged.
- **Reuse the shell primitives (FR9)**: drive all async UI through the existing
  `use-async` composable and `LoadingState` / `EmptyState` / `ErrorState`
  components, and all HTTP through the single typed `services/api-client.ts`
  (`ApiResult<T>`). No new shared primitives.
- **Frontend types mirror backend DTOs**: extend `types/launch.type.ts` with a
  `LaunchView` mirroring the enhanced read shape; the catalog and detail consume
  `LaunchView`, the existing write DTOs are untouched.
- **Rocket name resolution**: the catalog/detail load rockets alongside launches
  (reuse `listRockets()`) and resolve each `rocketId` to the rocket name; a
  missing/stale `rocketId` degrades gracefully (show the raw id).
- **Sold-out as a pure view concern**: a launch is "sold out" WHEN
  `seatsAvailable === 0`; the list/detail mark it visually and accessibly. This
  reads the API-provided field — it is presentation, not a duplicated rule.
- **Read-only, no global store**: views own local loaded state; retry re-runs the
  loader. Pinia stays deferred (consistent with the shell and FR10/FR11).
- **Styling & quality**: lightweight `<script setup lang="ts">` + `<style scoped>`
  + shared CSS variables, following `coding-vue-frontend`, `coding-typescript`,
  `.claude/rules/ts.md`; apply `designing-ux` for states, feedback, accessibility,
  and microcopy. CoreUI adoption stays deferred.

## Target structure (added/changed by this plan)

```text
backend/src/
├── types/
│   └── launches.type.ts          # (edit) add LaunchView = Launch & { seatsAvailable }
├── launches/
│   ├── launches.service.ts       # (edit) add withAvailability(launch) -> LaunchView
│   ├── launches.service.test.ts  # (edit) cover withAvailability derivation
│   └── launches.router.ts        # (edit) map both GET routes through withAvailability
frontend/src/
├── types/
│   └── launch.type.ts            # (edit) add LaunchView with seatsAvailable
├── services/
│   └── launches-api.ts           # (edit) getLaunch(id); list/getLaunch return LaunchView
├── components/
│   └── LaunchCatalogList.vue     # (new) catalog table/cards + rocket name + sold-out
└── views/
    ├── CustomerView.vue          # (edit) link to the launch catalog
    ├── LaunchCatalogView.vue     # (new) orchestrates list load via use-async
    └── LaunchDetailView.vue      # (new) orchestrates detail load via use-async
tests/
└── launches.spec.ts             # (edit) assert seatsAvailable on GET list/detail
frontend tests/e2e                # (new) catalog + detail acceptance coverage
```

### Step 1: Backend — derive and expose `seatsAvailable` on launch reads
Serve remaining availability from the API as a read-only derived field.
- [ ] Add `LaunchView = Launch & { seatsAvailable: number }` to `backend/src/types/launches.type.ts`; keep `CreateLaunchDto`/`UpdateLaunchDto` unchanged.
- [ ] Add `withAvailability(launch): LaunchView` to `launches.service.ts`, computing `seatsAvailable` via `bookings.service.getRemainingSeats` (clamp at 0 if ever negative).
- [ ] Map `GET /` (over `findAll()`) and `GET /:id` through `withAvailability` in `launches.router.ts`; leave create/update/delete responses unchanged and 404 behavior intact.
- [ ] Confirm no import cycle issue (`launches.router → bookings.service → launches.repository`); keep create/update DTOs rejecting any incoming `seatsAvailable`.

### Step 2: Backend — tests for the derived field
Prove `seatsAvailable` is correct, read-only, and consistent with bookings.
- [x] Extend `launches.service.test.ts` (Vitest): `withAvailability` returns `seatsOffered` with no bookings, and `seatsOffered − booked` after bookings, including the zero (sold-out) case.
- [x] Extend `tests/launches.spec.ts` (Playwright): `GET /api/launches` and `GET /api/launches/:id` include `seatsAvailable`; value drops after a booking; the field is not stored/echoed by create/update.

### Step 3: Frontend — read types and catalog API
Mirror the enhanced read shape and expose typed catalog reads.
- [ ] Add `LaunchView` (`Launch & { seatsAvailable: number }`) to `frontend/src/types/launch.type.ts`; keep the write DTOs untouched.
- [ ] In `services/launches-api.ts`, change `listLaunches()` to return `ApiResult<LaunchView[]>` and add `getLaunch(id): Promise<ApiResult<LaunchView>>` (`GET /launches/:id`); reuse `listRockets()` from `rockets-api.ts` for names.

### Step 4: Frontend — LaunchCatalogList component
Presentational list of the program with rocket names and sold-out marking.
- [ ] Build `LaunchCatalogList.vue` (`<script setup lang="ts">`) rendering each launch: mission, rocket name (resolved from a `rockets` prop/map), date, `pricePerSeat`, `seatsAvailable`; degrade gracefully for an unknown `rocketId`.
- [ ] Mark a launch as sold out WHEN `seatsAvailable === 0` (visible badge + accessible text); emit `select(launch)` (or render a `RouterLink`) to open detail.
- [ ] Keep it presentational (no fetching); accessible semantics; parent owns empty state.

### Step 5: Frontend — catalog and detail views + routing
Wire loading/empty/error states and navigation via the shared async primitives.
- [ ] Build `LaunchCatalogView.vue` using `use-async` to load launches + rockets (`listLaunches()` + `listRockets()`): `LoadingState` while loading, `ErrorState` with retry on failure, `EmptyState` when zero launches, else `LaunchCatalogList`.
- [ ] Build `LaunchDetailView.vue` using `use-async` to load `getLaunch(:id)` + rockets: show mission, rocket name, date, price per seat, minimum passengers, seats offered, and seats available; sold-out indicator; `ErrorState` (with retry/back) when the launch is missing.
- [ ] Add lazy-loaded routes `/customer/launches` and `/customer/launches/:id` in `router/index.ts`; navigate from catalog to detail; link the catalog from `CustomerView.vue`.
- [ ] Apply `designing-ux`: clear microcopy, focus/heading structure, accessible sold-out and price/date formatting.

### Step 6: Verify and finalize
Typecheck, test, and confirm every acceptance criterion end-to-end.
- [x] `cd backend && npm run test` and `cd frontend && npm run test` green; `cd backend && npm run build` and `cd frontend && npm run build` (`vue-tsc -b && vite build`) pass with no type errors.
- [x] Add a Playwright E2E suite (e.g. `tests/frontend-launch-catalog.spec.ts`) covering: catalog load with rocket names + seats available, loading, empty, error+retry, sold-out marking, select → detail, detail fields, and detail error for a non-existent id.
- [ ] Manual check (backend + frontend dev running): catalog lists launches with names/availability, sold-out shows at zero seats, detail opens and shows all fields, error+retry works, non-existent id shows the error state.
- [ ] Update PRD FR12 status `Planned → InProgress`; set this spec status `Planned → InProgress` while building (Done on completion). `IA/ERM.md` unchanged.

## Acceptance Criteria coverage

| Criterion (spec) | Step |
|---|---|
| Catalog requests `/api/launches`, shows mission/rocket name/date/price/seats available | 1, 3, 4, 5 |
| Loading state while the catalog request is in progress | 5 |
| Error state with retry on catalog request failure | 5 |
| Empty state when no launches exist | 5 |
| Zero remaining seats → marked sold out | 1, 4, 5 |
| Selecting a launch opens its detail view | 4, 5 |
| Detail requests `GET /api/launches/:id`, shows mission/rocket/date/price/min passengers/seats offered/seats available | 1, 3, 5 |
| Launch read responses include derived read-only `seatsAvailable` | 1, 2 |
| Detail request for a non-existent launch → error state | 1, 5 |

## Out of scope / follow-ups

- Customer booking flow (FR13) — the booking action and confirmation are a later stage.
- New endpoints — none; the catalog reuses `/api/launches`, `/api/launches/:id`, `/api/rockets`.
- CoreUI styling adoption (`styling-coreui`) and Pinia/global store — still deferred.
- `IA/ERM.md` — unchanged; `seatsAvailable` is derived and not persisted.
