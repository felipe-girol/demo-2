# Implementation Plan for feat-frontend-app-shell

Implements FR9 (Frontend application shell and API integration) per
[spec](specs/feat-frontend-app-shell.spec.md), the umbrella
[staged-delivery spec](specs/feat-frontend-staged-delivery.spec.md) Stage 1,
and the [ADD](ADD.md). Replaces the default Vite `HelloWorld` scaffold with the
Vue 3 SPA foundation every later stage (FR10–FR13) reuses: client-side routing,
a shared layout with agency/customer navigation, a single typed API client on
`/api`, a `GET /api/health` service indicator, and reusable loading/empty/error
states.

Scope is the shell only. The backend API and its rules are already implemented
and out of scope; feature screens land in later stages. No new persisted
entities → `IA/ERM.md` is unchanged (the shell only mirrors existing DTOs and
holds ephemeral session state).

## Design decisions

- **Routing**: add `vue-router` (v4) with HTML5 history mode. Routes mount inside
  one shared `AppLayout` so navigation never triggers a full reload, and a
  catch-all renders the not-found view inside the same layout.
- **API base path = `/api` via Vite dev proxy**: the typed client targets the
  relative base `/api` (the spec's required base path), read from
  `import.meta.env.VITE_API_BASE_URL` (default `/api`). A Vite dev-server proxy
  forwards `/api` → `http://localhost:3000`, so dev needs no CORS and prod can
  serve the SPA behind the same origin. This is preferred over hardcoding
  `http://localhost:3000/api` (which the vue skill sample shows) because the spec
  mandates the `/api` base and "the API remains the single source of truth".
- **Single typed client + normalized result**: `services/api-client.ts` exposes a
  generic `request<T>()` returning a discriminated `ApiResult<T>`
  (`{ ok: true; data } | { ok: false; error }`) so callers never see raw
  throws, plus a typed `getHealth()`. No business rules live here.
- **Async state composable**: `composables/use-async.ts` wraps loading/error/data
  + a `retry()` so every feature screen drives the shared state components
  uniformly (satisfies the loading/error-with-retry/empty criteria once).
- **Presentational state components**: `LoadingState`, `EmptyState`, `ErrorState`
  (with a retry emit) as dumb, reusable SFCs.
- **Health indicator**: `HealthIndicator.vue` calls `getHealth()` on mount via the
  composable; maps reachable → ok, failure/timeout → unreachable. A fetch timeout
  (AbortController) guarantees the unreachable state on a hung backend.
- **Styling**: lightweight `<style scoped>` + shared CSS variables for the shell
  primitives. CoreUI adoption is deferred to the feature stages (`styling-coreui`)
  to keep the shell dependency-light; the shell exposes structural classes the
  later stages can restyle.
- **TypeScript**: follow `.claude/rules/ts.md` and `coding-typescript`; SFCs use
  `<script setup lang="ts">` only (`coding-vue-frontend`).

## Target frontend structure (after this plan)

```text
frontend/src/
├── main.ts                       # bootstrap + router registration
├── App.vue                       # renders <AppLayout> + <RouterView>
├── router/index.ts               # routes + catch-all
├── types/
│   ├── health.type.ts            # HealthStatus DTO (mirrors GET /api/health)
│   └── api.type.ts               # ApiResult<T>, ApiError
├── services/
│   └── api-client.ts             # typed request<T>() + getHealth()
├── composables/
│   └── use-async.ts              # loading/error/data + retry
├── components/
│   ├── AppLayout.vue             # header/nav + <slot/> content outlet
│   ├── AppNav.vue                # links: Home / Agency / Customer
│   ├── HealthIndicator.vue       # service status from /api/health
│   ├── LoadingState.vue
│   ├── EmptyState.vue
│   └── ErrorState.vue            # message + retry affordance
└── views/
    ├── HomeView.vue              # landing
    ├── AgencyView.vue            # placeholder for FR10/FR11
    ├── CustomerView.vue          # placeholder for FR12/FR13
    └── NotFoundView.vue          # fallback route
```

### Step 1: Add routing dependency and Vite proxy
Prepare tooling so the SPA can route client-side and reach `/api` in dev.
- [ ] `cd frontend && npm install vue-router@4`.
- [ ] Add a dev-server proxy in `vite.config.ts`: `server.proxy['/api'] → http://localhost:3000` (`changeOrigin: true`).
- [ ] Add `frontend/.env` with `VITE_API_BASE_URL=/api` (documented default).

### Step 2: Define frontend types and the typed API client
One source of HTTP access returning typed data or a normalized error.
- [ ] Add `types/api.type.ts`: `ApiError = { status: number; message: string }` and `ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiError }`.
- [ ] Add `types/health.type.ts`: `HealthStatus = { status: string; timestamp: string }`.
- [ ] Add `services/api-client.ts` reading `import.meta.env.VITE_API_BASE_URL` (default `/api`); implement `request<T>(path, init?): Promise<ApiResult<T>>` with an AbortController timeout, mapping network/timeout/non-2xx into `ApiError`.
- [ ] Export `getHealth(): Promise<ApiResult<HealthStatus>>` calling `GET /health`.

### Step 3: Build the reusable async composable and state components
Shared loading/empty/error primitives every later screen consumes.
- [ ] Add `composables/use-async.ts` returning `{ data, error, loading, run, retry }`, driving an `ApiResult`-returning loader and keeping the last loader for `retry()`.
- [ ] Add `LoadingState.vue` (spinner/“Loading…”, optional `label` prop).
- [ ] Add `EmptyState.vue` (icon/message, `message` prop with a sensible default).
- [ ] Add `ErrorState.vue` (shows `message` prop, emits `retry` from a retry button).

### Step 4: Build the shared layout, navigation, and health indicator
The chrome rendered around every route.
- [ ] Add `AppNav.vue` with `<RouterLink>`s to Home, Agency, Customer (active-link styling).
- [ ] Add `HealthIndicator.vue` using `use-async` + `getHealth()` on `onMounted`; render reachable vs. unreachable (loading shows a neutral “checking” state).
- [ ] Add `AppLayout.vue`: header containing `AppNav` + `HealthIndicator` and a `<slot/>` content outlet; apply base layout styles and CSS variables.

### Step 5: Add views and wire the router
Real routes so navigation resolves before feature screens exist.
- [ ] Add `HomeView.vue` (landing/intro), `AgencyView.vue` and `CustomerView.vue` placeholders (each can demo a state component), and `NotFoundView.vue`.
- [ ] Add `router/index.ts` with `createRouter`/`createWebHistory` and routes `/` (Home), `/agency`, `/customer`, and `:pathMatch(.*)*` → NotFound.
- [ ] Update `App.vue` to render `<AppLayout><RouterView /></AppLayout>`.
- [ ] Register the router in `main.ts` (`app.use(router)`); keep `./style.css` import.

### Step 6: Remove scaffold and tidy
Drop the default Vite artifacts the shell replaces.
- [ ] Delete `components/HelloWorld.vue` and unused scaffold assets (`assets/vue.svg`, `assets/vite.svg` if unreferenced).
- [ ] Reconcile `style.css` to provide the shared base styles/variables the layout relies on.

### Step 7: Verify and finalize
Typecheck, build, and confirm the acceptance criteria end-to-end.
- [ ] `cd frontend && npm run build` (`vue-tsc -b && vite build`) passes with no type errors.
- [ ] Manual check with backend running (`cd backend && npm run dev`) + `npm run dev`: nav routes without reload; indicator shows reachable, then unreachable when backend is stopped; loading/empty/error + retry render; unknown path shows NotFound inside the layout.
- [x] Add a Playwright shell E2E suite (`tests/frontend-shell.spec.ts`) covering all acceptance criteria (layout/nav, client-side routing, health reachable/unreachable, `/api` base, loading/empty states, failure+recovery, NotFound) against the Vite dev server; refresh `tests/smoke.spec.ts` for the new shell.
- [ ] Update PRD FR9 status `NotStarted → InProgress`; set this spec status `Planned → InProgress` while building (Done on completion).

## Acceptance Criteria coverage

| Criterion (spec) | Step |
|---|---|
| Shared layout with agency + customer navigation | 4, 5 |
| Nav routes client-side without full reload | 1, 5 |
| On start, request `GET /api/health` and show indicator | 2, 4 |
| Health failure/timeout → unreachable indicator | 2, 4 |
| Single typed API client on `/api` base for all data access | 1, 2 |
| Reusable loading state while requests are in progress | 3 |
| Reusable error state with retry affordance on failure | 3 |
| Reusable empty state when a screen has no data | 3 |
| Unknown path → not-found route within the shared layout | 5 |

## Out of scope / follow-ups

- Feature screens (rockets, launches, catalog, bookings) — FR10–FR13, later stages.
- CoreUI styling system adoption (`styling-coreui`) — deferred to feature stages.
- Pinia/global store — not needed for the shell; revisit if shared cross-route
  state appears in later stages.
