# Implementation Plan for feat-launches-management

Implements FR4 (Launch scheduling) and FR5 (Launch validation) per
[spec](specs/feat-launches-management.spec.md) and [ADD](ADD.md).
Mirrors the existing feature module pattern (functional layered, no classes),
adding a **service layer** because launches carry cross-entity rules against
the `rockets` repository. Endpoints: `GET /api/launches`,
`GET /api/launches/:id`, `POST /api/launches`, `PUT /api/launches/:id`,
`DELETE /api/launches/:id`.

## Design decisions

- **Service layer required**: unlike `rockets`/`customers` (plain CRUD), launches
  must validate against another entity — `rocketId` existence and
  `seatsOffered <= rocket.capacity`. Per ADD (Layered Modules, ADR-1) these
  cross-entity rules live in `launches/launches.service.ts`, which reads the
  `rockets` repository. The router stays thin and never imports `rockets` directly.
- **Two-tier validation**: intra-entity, body-shape rules (non-empty `mission`,
  positive `pricePerSeat`, integer `minPassengers`/`seatsOffered` >= 1, future
  `date`, `minPassengers <= seatsOffered`) go in a colocated
  `launches/launches.validation.ts` reusing the shared `FieldValidator`
  composition from `utils/validation.ts` (same approach as `customers`).
  Cross-entity rules (rocket existence + capacity) are enforced in the service.
- **Error responses**: reuse shared `sendValidationErrors` (400) and `sendNotFound`
  (404). The rocket-existence and capacity-overflow failures are returned as
  **400 validation errors** (the spec explicitly says "400 validation error"),
  surfaced as a `string[]` from the service so the router can call
  `sendValidationErrors` uniformly.
- **Service result shape**: service create/update return a discriminated result
  `{ launch }` on success or `{ errors: string[] }` on cross-entity failure,
  keeping HTTP mapping in the router. `update`/`remove` also signal not-found.
- **Repository**: standard in-memory `Map<string, Launch>` CRUD with
  `crypto.randomUUID`, identical shape to `rockets.repository.ts`.
- **ERM unchanged**: `IA/ERM.md` already models the `Launch` entity and its
  `Rocket 1—* Launch` relationship exactly as this spec requires; no edit needed.
- **Seat availability out of scope**: derived field belongs to the future
  `bookings` feature; not stored or computed here.

### Step 1: Define the launch types
Create the entity, constants, and DTO contracts following `types/rockets.type.ts`.
- [ ] Add `backend/src/types/launches.type.ts`.
- [ ] Define `Launch = { id, rocketId, mission, date, pricePerSeat, minPassengers, seatsOffered }`.
- [ ] Add `MIN_PASSENGERS = 1` / `MIN_SEATS = 1` constants.
- [ ] Define `CreateLaunchDto = Pick<Launch, "rocketId" | "mission" | "date" | "pricePerSeat" | "minPassengers" | "seatsOffered">` and `UpdateLaunchDto = Partial<CreateLaunchDto>`.

### Step 2: Extend shared validation primitives
Add reusable numeric/date validators to `utils/validation.ts` (kept generic, no launch imports).
- [ ] Add `positiveNumber(field)` (number > 0) and `positiveInteger(field)` (integer >= 1) `FieldValidator` builders.
- [ ] Add `futureDateString(field)` validator (valid ISO date strictly after now).
- [ ] Keep them entity-agnostic so `bookings` can reuse them later.

### Step 3: Implement the launches validation
Validate body shape and intra-entity cross-field rules.
- [ ] Add `backend/src/launches/launches.validation.ts`.
- [ ] Compose field validators: `rocketId` non-empty string, `mission` non-empty, `pricePerSeat` positive number, `minPassengers`/`seatsOffered` positive integers, `date` future.
- [ ] Add a cross-field check `minPassengers <= seatsOffered` (when both present/valid).
- [ ] Export `validateCreateLaunch(body): string[]` and `validateUpdateLaunch(body): string[]` (partial).

### Step 4: Implement the launches repository
In-memory `Map<string, Launch>` CRUD, mirroring `rockets.repository.ts`.
- [ ] Add `backend/src/launches/launches.repository.ts`.
- [ ] Implement `findAll`, `findById`, `create(dto)` (`crypto.randomUUID`), `update(id, dto)`, `remove(id)`.

### Step 5: Implement the launches service
Apply cross-entity rules against the rockets repository.
- [ ] Add `backend/src/launches/launches.service.ts`.
- [ ] `createLaunch(dto)`: check `rockets.findById(dto.rocketId)` (else error), check `dto.seatsOffered <= rocket.capacity` (else capacity error); on success `repository.create`.
- [ ] `updateLaunch(id, dto)`: load existing (404 signal if missing), re-run cross-entity checks against the effective rocket/seats, then `repository.update`.
- [ ] Return a result object: `{ launch }` | `{ errors }` | not-found signal; log via `logInfo`/context `"Launches"`.

### Step 6: Implement the launches router
HTTP layer wiring validation, service, repository reads, errors, and logging.
- [ ] Add `backend/src/launches/launches.router.ts` exporting `launchesRouter`.
- [ ] `GET /` → `repository.findAll`; `GET /:id` → launch or `sendNotFound` (404).
- [ ] `POST /` → `validateCreateLaunch` (400) → `createLaunch`; map service errors to `sendValidationErrors` (400), success to 201.
- [ ] `PUT /:id` → `validateUpdateLaunch` (400) → `updateLaunch`; map not-found to 404, errors to 400, success to 200.
- [ ] `DELETE /:id` → `repository.remove` → 204 or `sendNotFound` (404); log create/update/delete.

### Step 7: Mount the router
Expose the feature under `/api/launches`.
- [ ] Import and `router.use("/launches", launchesRouter)` in `backend/src/routes/index.ts`.

### Step 8: Add unit tests (Vitest)
Colocated fast tests for pure logic.
- [ ] `launches.validation.test.ts`: each field rule + `minPassengers <= seatsOffered` + future-date.
- [ ] `launches.repository.test.ts`: CRUD round-trips and `remove` idempotency.
- [ ] `launches.service.test.ts`: rocket-not-found, capacity overflow, happy path (seed a rocket).

### Step 9: Add Playwright acceptance tests
Cover every acceptance criterion in `tests/launches.spec.ts`.
- [x] POST valid → 201 with `id` and echoed fields (seed a rocket first via `/api/rockets`).
- [x] POST unknown `rocketId` → 400; `seatsOffered > capacity` → 400.
- [x] POST `minPassengers > seatsOffered` / past `date` / empty `mission` / non-positive `pricePerSeat` → 400.
- [x] GET list → array; GET `/:id` → details; GET/PUT/DELETE unknown id → 404.
- [x] PUT valid → 200 modified; DELETE existing → 204.

### Step 10: Verify and finalize
Build, run, and update project tracking.
- [x] `cd backend && npx tsc --noEmit` and `npm run build` pass; `npm run test` (Vitest) green.
- [x] Start backend, run `npm test` — launches Playwright suite green.
- [ ] Update ADD + CLAUDE.md launch endpoint status Planned → Implemented.
- [ ] Set spec status "Planned" → "Done"; keep feature "InProgress" while building.

## Acceptance Criteria coverage

| Criterion (spec) | Step |
|---|---|
| POST valid → 201 with id | 1, 4, 5, 6, 9 |
| Unknown `rocketId` → 400 | 5, 6, 8, 9 |
| `seatsOffered` > capacity → 400 | 5, 6, 8, 9 |
| `minPassengers` > `seatsOffered` / past date / empty mission / non-positive price → 400 | 2, 3, 6, 8, 9 |
| GET list → all launches | 4, 6, 9 |
| GET by id → details | 4, 6, 9 |
| GET/PUT/DELETE unknown id → 404 | 5, 6, 9 |
| PUT valid → 200 modified | 3, 5, 6, 9 |
| DELETE existing → 204 | 4, 6, 9 |
