# Changelog

## [1.9.0] - 2026-06-30

### Added
- Launch catalog and availability browsing (FR12): customer-facing, read-only catalog listing the launch program from `/api/launches`, plus a launch detail view, building on the app shell (FR9) and the derived seat availability (FR4/FR7)
- Backend: launch read responses (`GET /api/launches` and `GET /api/launches/:id`) now expose a derived, read-only `seatsAvailable` field (`seatsOffered` minus seats already booked) via a new `withAvailability(launch)` helper in `launches.service.ts` reusing `bookings.service.getRemainingSeats`; the field is computed on read, never stored, and never accepted on create/update
- Backend `LaunchView = Launch & { seatsAvailable: number }` read type in `types/launches.type.ts`; create/update DTOs unchanged
- `LaunchCatalogView` orchestrating the catalog through the shared `use-async` composable: loads launches and rockets together, rendering `LoadingState` while loading, `ErrorState` with retry on failure, `EmptyState` when no launches exist, else the catalog
- `LaunchCatalogList` presentational component rendering each launch's mission, resolved rocket name, date, price per seat, and remaining `seatsAvailable`, with an accessible sold-out indicator WHEN `seatsAvailable === 0`; degrades gracefully when a `rocketId` has no matching rocket
- `LaunchDetailView` loading `GET /api/launches/:id` + rockets via `use-async`, showing mission, rocket name, date, price per seat, minimum passengers, seats offered, and seats available, with a sold-out indicator and an `ErrorState` (retry/back) for a non-existent launch
- `utils/launch-format.ts` pure helpers for date/price formatting and sold-out presentation
- Typed `services/launches-api.ts` now returns `ApiResult<LaunchView[]>` from `listLaunches()` and adds `getLaunch(id): Promise<ApiResult<LaunchView>>`; frontend `types/launch.type.ts` mirrors the enhanced read shape (`LaunchView`)
- Lazy-loaded `/customer/launches` and `/customer/launches/:id` routes linked from `CustomerView`
- Vitest unit tests for `withAvailability` (no bookings, partial, and sold-out cases) and `launch-format`; Playwright coverage asserting `seatsAvailable` on the launch list/detail endpoints and a frontend E2E suite (`tests/frontend-launch-catalog.spec.ts`) covering catalog load, loading/empty/error+retry, sold-out marking, select → detail, detail fields, and detail error for a non-existent id

## [1.8.0] - 2026-06-30

### Added
- Launch management UI (FR11): Agency screen to list, create, edit, and delete launches via `/api/launches`, building on the app shell (FR9), rocket management UI (FR10), and the launch CRUD API (FR4/FR5)
- `LaunchesView` orchestrating the screen through the shared `use-async` composable: loads launches and rockets together, rendering `LoadingState` while loading, `ErrorState` with retry on failure, `EmptyState` when no launches exist, else the launch list
- `LaunchList` presentational table of `mission`, resolved rocket name, `date`, `pricePerSeat`, `minPassengers`, and `seatsOffered` with per-row edit and delete actions; degrades gracefully when a `rocketId` has no matching rocket
- Reusable `LaunchForm` serving both create (empty) and edit (pre-filled) with a rocket selector populated from `/api/rockets`, inline per-field validation feedback, and preserved input on submit failure
- `ConfirmDialog` confirmation step before issuing `DELETE /api/launches/:id`
- Typed `services/launches-api.ts` (`listLaunches`/`createLaunch`/`updateLaunch`/`deleteLaunch`) returning the discriminated `ApiResult<T>` through the single `/api` client
- Frontend `types/launch.type.ts` mirroring backend DTOs (`Launch`, `CreateLaunchDto`, `UpdateLaunchDto`); the API stays the single source of truth
- Pure `validation/launch-form.ts` (`validateLaunchForm`) mirroring backend rules (FR5): known `rocketId`, non-empty `mission`, future `date`, positive `pricePerSeat`, integer `seatsOffered <=` selected rocket capacity, integer `minPassengers <= seatsOffered`
- Lazy-loaded `/agency/launches` route linked from `AgencyView`
- Vitest unit tests for `validateLaunchForm`; Playwright E2E suite (`tests/frontend-launches.spec.ts`) covering every acceptance criterion

## [1.7.0] - 2026-06-29

### Added
- Rocket management UI (FR10): Agency screen to list, create, edit, and delete rockets via `/api/rockets`, building on the app shell (FR9) and the rocket CRUD API (FR1/FR2)
- `RocketsView` orchestrating the screen through the shared `use-async` composable: `LoadingState` while loading, `ErrorState` with retry on failure, `EmptyState` when no rockets exist, else the rocket list
- `RocketList` presentational table of `name`, `range`, and `capacity` with per-row edit and delete actions
- Reusable `RocketForm` serving both create (empty) and edit (pre-filled) with inline per-field validation feedback and preserved input on submit failure
- `ConfirmDialog` confirmation step before issuing `DELETE /api/rockets/:id`
- Typed `services/rockets-api.ts` (`listRockets`/`createRocket`/`updateRocket`/`deleteRocket`) returning the discriminated `ApiResult<T>` through the single `/api` client
- Frontend `types/rocket.type.ts` mirroring backend DTOs (`Rocket`, `CreateRocketDto`, `UpdateRocketDto`, `ROCKET_RANGES`, capacity bounds); the API stays the single source of truth
- Pure `validation/rocket-form.ts` (`validateRocketForm`) mirroring backend rules (non-empty `name`, `range` in the allowed set, integer `capacity` in `[1,10]`) for fast inline feedback
- Lazy-loaded `/agency/rockets` route linked from `AgencyView`
- Vitest unit tests for `rockets-api`, the API-client error parsing, and `validateRocketForm`; Playwright E2E suite (`tests/frontend-rockets.spec.ts`) covering every acceptance criterion

### Changed
- API client `request<T>()` now parses non-2xx JSON bodies (`errors: string[]` / `message`) into `ApiError.message` for meaningful error feedback, backward compatible with existing callers
- `AgencyView` now hosts/links the rocket management screen instead of acting as a placeholder

## [1.6.0] - 2026-06-28

### Added
- Frontend application shell (FR9): Vue 3 + Vite SPA foundation replacing the default `HelloWorld` scaffold
- Client-side routing with `vue-router` (HTML5 history) — `/` (Home), `/agency`, `/customer`, and a catch-all not-found route, all rendered inside a shared `AppLayout`
- Shared layout with top-level navigation (`AppNav`) between the agency and customer areas; navigation routes client-side without a full page reload
- Service `HealthIndicator` that calls `GET /api/health` on mount and shows reachable/unreachable, with an `AbortController` timeout guaranteeing the unreachable state on a hung backend
- Single typed API client (`services/api-client.ts`) on the `/api` base path exposing a generic `request<T>()` returning a discriminated `ApiResult<T>` and a typed `getHealth()`
- Reusable async composable (`composables/use-async.ts`) with `loading`/`error`/`data` + `retry()`, and presentational `LoadingState`, `EmptyState`, and `ErrorState` (retry affordance) components
- Frontend types `ApiResult<T>`/`ApiError` and `HealthStatus` mirroring backend DTOs (API remains the single source of truth)
- Vite dev-server proxy forwarding `/api` → `http://localhost:3000` and `VITE_API_BASE_URL` env default (`/api`)
- Vitest setup for the frontend with unit tests for the API client and async composable
- Playwright shell E2E suite (`tests/frontend-shell.spec.ts`) covering every acceptance criterion (layout/nav, client-side routing, health reachable/unreachable, `/api` base, loading/empty states, failure + retry recovery, not-found)

### Removed
- Default Vite scaffold artifacts: `components/HelloWorld.vue`, `assets/vue.svg`, `assets/vite.svg`, and unused `assets/hero.png` / `public/icons.svg`

## [1.5.0] - 2026-06-27

### Added
- Booking billing via mock payment gateway (FR8): `POST /api/bookings` now charges `seats * launch.pricePerSeat` through the new `utils/payment-gateway.ts` adapter at creation time
- Deterministic `charge(amount)` adapter returning a discriminated `PaymentResult` (`paid` with a gateway reference, or `failed` with a reason), logging each attempt and outcome
- `paymentReference` attribute on the `Booking` entity, returned by `GET /api/bookings` and `GET /api/bookings/:id`
- `sendPaymentRequired` (402) sender on the shared error handler for declined charges
- Vitest unit tests for the payment gateway and the billed/declined service branches; Playwright E2E coverage of the billed happy path

### Changed
- Booking creation charges only after launch, customer, and seat-availability checks pass; successful bookings persist with `paymentStatus = "paid"` and the gateway reference
- Declined charges (`402 Payment Required`) no longer persist the booking, leaving derived seat availability unaffected

### Removed
- `DEFAULT_PAYMENT_STATUS` (`"pending"`) FR7 placeholder; `paymentStatus` is now set from the gateway outcome

## [1.4.0] - 2026-06-15

### Added
- Seat bookings module (FR7) with `GET/POST /api/bookings` and `GET /api/bookings/:id`
- Booking model `{ id, launchId, customerId, seats, totalPrice, paymentStatus, createdAt }` bound to an existing launch and customer
- Service layer enforcing cross-entity rules: `launchId` and `customerId` must exist (both `404`)
- Derived seat availability: `seats` must not exceed launch `seatsOffered` minus the sum of existing bookings, returning `409 Conflict` on insufficient capacity
- `totalPrice` derived as `seats * launch.pricePerSeat`; `paymentStatus` defaults to `"pending"` (billing handled separately by FR8)
- Validation for non-empty `launchId`/`customerId` and integer `seats` >= 1 returning `400` on errors
- `GET /api/bookings?launchId=` filter returning only the bookings of that launch
- Playwright E2E tests covering all bookings acceptance criteria
- Vitest unit tests for the bookings repository, service, and validation

## [1.3.0] - 2026-06-15

### Added
- Launches management module (FR4, FR5) with full CRUD: `GET/POST /api/launches` and `GET/PUT/DELETE /api/launches/:id`
- Launch model `{ id, rocketId, mission, date, pricePerSeat, minPassengers, seatsOffered }` bound to an existing rocket
- Service layer enforcing cross-entity rules: `rocketId` must exist and `seatsOffered` must not exceed the rocket's capacity (both returning `400`)
- Validation for non-empty `mission`, positive `pricePerSeat`, integer `minPassengers`/`seatsOffered` >= 1, future `date`, and `minPassengers <= seatsOffered`
- Shared validation primitives `positiveNumber`, `positiveInteger`, and `futureDateString` (entity-agnostic, reusable by bookings)
- Playwright E2E tests covering all launches acceptance criteria
- Vitest unit tests for the launches repository, service, and validation

## [1.2.0] - 2026-06-15

### Added
- Customers management module (FR6) with `GET /api/customers`, `GET /api/customers/:id`, and `POST /api/customers`
- Customer model identified by unique `email` (natural key) with `name` and `phone`
- Email-uniqueness enforcement returning `409 Conflict` on duplicate registration
- Validation for non-empty `email`, `name`, and `phone` returning `400` on errors
- `sendConflict` (409) sender added to the shared error handler
- Playwright E2E tests covering all customers acceptance criteria
- Vitest unit tests for the customers repository and validation

### Changed
- Shared validation primitives extracted and reused across customers and rockets

## [1.1.0] - 2026-06-03

### Added
- Rockets CRUD API with RESTful endpoints (GET, POST, PUT, DELETE)
- Rocket model with name, range (suborbital/orbital/moon/mars), and capacity (1-10)
- Input validation for rocket range values and capacity limits
- E2E tests covering all rockets acceptance criteria

## [1.0.0] - Initial release

### Added
- Backend API with health endpoint
- Frontend with Vite + vanilla setup
- Playwright smoke tests for backend and frontend
