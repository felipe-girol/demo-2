# Implementation Plan for feat-seat-bookings

Implements FR7 (Seat bookings) per [spec](../specs/feat-seat-bookings.spec.md)
and [ADD](../ADD.md). Adds the `bookings` feature module following the established
functional layered pattern (no classes), with a **service layer** because a booking
carries cross-entity rules against the `launches` and `customers` repositories and
derives seat availability. Endpoints: `GET /api/bookings` (optional `launchId`
filter), `GET /api/bookings/:id`, `POST /api/bookings`.

> Billing through the mock payment gateway (FR8) is **out of scope**. `paymentStatus`
> is set to a default unbilled value (`"pending"`); no `payment-gateway` adapter is
> introduced by this spec.

## Design decisions

- **Service layer required**: a booking is not plain CRUD. Creation must verify the
  launch exists, the customer exists, and that requested `seats` fit the launch's
  remaining availability. Per ADD (Layered Modules, ADR-1) these cross-entity rules
  live in `bookings/bookings.service.ts`, which reads the `launches` and `customers`
  repositories. The router stays thin and never imports those repositories directly.
- **Derived seat availability (ADR-3)**: remaining seats = launch `seatsOffered`
  minus the sum of `seats` across that launch's existing bookings. Computed on demand
  in the service via a `bookings.repository.findByLaunch(launchId)` helper; never
  stored, keeping a single source of truth.
- **Two-tier validation**: body-shape rules (`launchId`/`customerId` non-empty
  strings, `seats` integer >= 1) go in a colocated `bookings/bookings.validation.ts`
  reusing `nonEmptyString` and `positiveInteger` from `utils/validation.ts` (same
  approach as `launches`/`customers`). Cross-entity and availability rules are
  enforced in the service.
- **Distinct error mapping**: the spec requires three distinct failures that map to
  different HTTP codes, so the service returns a discriminated result the router
  translates:
  - body-shape invalid → **400** via `sendValidationErrors`.
  - unknown `launchId` or unknown `customerId` → **404** via `sendNotFound`.
  - `seats` exceed remaining availability → **409** via `sendConflict` (already in
    `utils/error-handler.ts`).
- **Derived fields on create**: `totalPrice = seats * launch.pricePerSeat`,
  `paymentStatus = "pending"`, `createdAt = new Date().toISOString()` are computed by
  the service and passed to the repository, mirroring how launches assemble entities.
- **Repository**: standard in-memory `Map<string, Booking>` with `crypto.randomUUID`,
  adding read helpers `findAll`, `findById`, `findByLaunch(launchId)`, and
  `create(booking)`. No update/delete in scope.
- **ERM unchanged**: `IA/ERM.md` already models the `Booking` entity, its attributes,
  and the `Launch 1—* Booking *—1 Customer` relationships exactly as this spec
  requires; no edit needed.

### Step 1: Define the booking types
Create the entity, payment-status constant, and DTO contracts following `types/launches.type.ts`.
- [ ] Add `backend/src/types/bookings.type.ts`.
- [ ] Define `PaymentStatus` (`"pending" | "paid" | "failed"`) and `DEFAULT_PAYMENT_STATUS = "pending"`.
- [ ] Define `Booking = { id, launchId, customerId, seats, totalPrice, paymentStatus, createdAt }`.
- [ ] Define `CreateBookingDto = Pick<Booking, "launchId" | "customerId" | "seats">`.

### Step 2: Implement the bookings validation
Validate request body shape and field types.
- [ ] Add `backend/src/bookings/bookings.validation.ts`.
- [ ] Compose field validators: `launchId` non-empty string, `customerId` non-empty string, `seats` positive integer (>= 1).
- [ ] Export `validateCreateBooking(body): string[]`.

### Step 3: Implement the bookings repository
In-memory `Map<string, Booking>` storage with the read helpers the service needs.
- [ ] Add `backend/src/bookings/bookings.repository.ts`.
- [ ] Implement `findAll()`, `findById(id)`, `findByLaunch(launchId)` (filter by `launchId`).
- [ ] Implement `create(booking: Booking)` that stores and returns the entity (id pre-assigned by the service, or assign `crypto.randomUUID` here — keep consistent with launches repo).

### Step 4: Implement the bookings service
Apply cross-entity rules, derive fields, and enforce availability.
- [ ] Add `backend/src/bookings/bookings.service.ts`.
- [ ] `getRemainingSeats(launch)`: `launch.seatsOffered` minus sum of `seats` from `repository.findByLaunch(launch.id)`.
- [ ] `createBooking(dto)`: load launch (`launches.findById`) → not-found; load customer (`customers.findById`) → not-found; compute remaining → conflict if `dto.seats > remaining`; else derive `totalPrice`/`paymentStatus`/`createdAt` and `repository.create`.
- [ ] Return a discriminated result: `{ status: "ok"; booking }` | `{ status: "not-found"; message }` | `{ status: "conflict"; message }`; log via `logInfo` context `"Bookings"`.

### Step 5: Implement the bookings router
HTTP layer wiring validation, service, repository reads, errors, and logging.
- [ ] Add `backend/src/bookings/bookings.router.ts` exporting `bookingsRouter`.
- [ ] `GET /` → if `launchId` query present use `repository.findByLaunch`, else `repository.findAll`.
- [ ] `GET /:id` → booking or `sendNotFound` (404).
- [ ] `POST /` → `validateCreateBooking` (400) → `createBooking`; map `not-found`→`sendNotFound` (404), `conflict`→`sendConflict` (409), `ok`→201 with the booking.

### Step 6: Mount the router
Expose the feature under `/api/bookings`.
- [ ] Import and `router.use("/bookings", bookingsRouter)` in `backend/src/routes/index.ts`.

### Step 7: Add unit tests (Vitest)
Colocated fast tests for pure logic.
- [ ] `bookings.validation.test.ts`: each field rule (missing/empty `launchId`/`customerId`, non-integer / `< 1` `seats`).
- [ ] `bookings.repository.test.ts`: `create`/`findById` round-trip, `findByLaunch` filtering, `findAll`.
- [ ] `bookings.service.test.ts`: launch-not-found, customer-not-found, seats-over-availability (409), happy path incl. `totalPrice` math and `paymentStatus = "pending"` (seed a rocket + launch + customer).

### Step 8: Add Playwright acceptance tests
Cover every acceptance criterion in `tests/bookings.spec.ts`.
- [x] Helper to seed a rocket → launch → customer and return ids/price.
- [x] POST valid → 201 with `id`, computed `totalPrice` (= seats * pricePerSeat), `createdAt`, `paymentStatus`.
- [x] POST unknown `launchId` → 404; unknown `customerId` → 404.
- [x] POST `seats` not integer >= 1 → 400; POST `seats` exceeding remaining availability → 409.
- [x] GET list → array; GET with `?launchId=` → only that launch's bookings; GET unknown id → 404.

### Step 9: Verify and finalize
Build, run, and update project tracking.
- [ ] `cd backend && npx tsc --noEmit` and `npm run build` pass; `npm run test` (Vitest) green.
- [x] Start backend, run `npm test` — bookings Playwright suite green.
- [x] Update ADD + CLAUDE.md `/api/bookings` endpoint status Planned → Implemented.
- [x] Set spec status "Planned" → "Released"; feature Implemented.

## Acceptance Criteria coverage

| Criterion (spec) | Step |
|---|---|
| POST valid → 201 with id, totalPrice, createdAt | 1, 3, 4, 5, 8 |
| `totalPrice` = seats * pricePerSeat | 4, 7, 8 |
| Unknown `launchId` → 404 | 4, 5, 7, 8 |
| Unknown `customerId` → 404 | 4, 5, 7, 8 |
| `seats` not integer >= 1 → 400 | 2, 5, 7, 8 |
| `seats` exceed remaining availability → 409 | 4, 5, 7, 8 |
| GET list → all bookings | 3, 5, 8 |
| GET `?launchId=` → only that launch's bookings | 3, 5, 8 |
| GET unknown id → 404 | 5, 8 |
