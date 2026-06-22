# Implementation Plan for feat-customers-management

Implements FR6 (Customers Management) per
[spec](specs/feat-customers-management.spec.md) and [ADD](ADD.md).
Mirrors the existing `rockets` feature module pattern (functional layered:
router + repository, no service since this is simple CRUD with one
cross-record uniqueness rule). Endpoints: `GET /api/customers`,
`GET /api/customers/:id`, `POST /api/customers`.

## Design decisions

- **No service layer**: customer registration is CRUD plus an email-uniqueness
  check, which lives in the repository (single source of truth for the `Map`).
  No cross-entity rules → router calls the repository directly, as `rockets` does.
- **Customer-specific validation**: the shared `utils/validation.ts` is currently
  rocket-bound (imports rocket types). Add a dedicated
  `customers/customers.validation.ts` reusing the same `FieldValidator`
  composition pattern rather than overloading the shared file.
- **409 conflict**: extend the shared `utils/error-handler.ts` with a
  `sendConflict` sender (per ADR-6 / ADD cross-cutting concerns) for the
  duplicate-email case.

### Step 1: Define the customer types
Create the entity and DTO contracts following `types/rockets.type.ts`.
- [ ] Add `backend/src/types/customers.type.ts`.
- [ ] Define `Customer = { id, email, name, phone }` (all strings).
- [ ] Define `CreateCustomerDto = Pick<Customer, "email" | "name" | "phone">`.

### Step 2: Extend the shared error handler
Add the conflict (409) response sender used by duplicate-email handling.
- [ ] Add `sendConflict(res, message)` to `backend/src/utils/error-handler.ts`.
- [ ] Log the conflict via `logError` with context, matching existing senders.

### Step 3: Implement the customers validation
Validate `email`, `name`, and `phone` as non-empty strings.
- [ ] Add `backend/src/customers/customers.validation.ts`.
- [ ] Reuse the `FieldValidator` composition pattern from `utils/validation.ts`.
- [ ] Export `validateCreateCustomer(body): string[]` (non-empty string checks).

### Step 4: Implement the customers repository
In-memory `Map<string, Customer>` CRUD plus email lookup.
- [ ] Add `backend/src/customers/customers.repository.ts`.
- [ ] Implement `findAll`, `findById`, `create(dto)` using `crypto.randomUUID`.
- [ ] Implement `findByEmail(email)` to support the uniqueness check.

### Step 5: Implement the customers router
HTTP layer wiring validation, repository, errors, and logging.
- [ ] Add `backend/src/customers/customers.router.ts` exporting `customersRouter`.
- [ ] `GET /` returns `findAll`; `GET /:id` returns customer or `sendNotFound` (404).
- [ ] `POST /` runs `validateCreateCustomer` → `sendValidationErrors` (400) on errors.
- [ ] `POST /` checks `findByEmail` → `sendConflict` (409) on duplicate, else
      create and return 201.
- [ ] Log create and retrieve operations with `logInfo` context `"Customers"`.

### Step 6: Mount the router
Expose the feature under `/api/customers`.
- [ ] Import and `router.use("/customers", customersRouter)` in `routes/index.ts`.

### Step 7: Add Playwright acceptance tests
Cover all acceptance criteria in `tests/customers.spec.ts`.
- [x] POST valid → 201 with `id`, `email`, `name`, `phone`.
- [x] POST duplicate email → 409; POST missing/empty email/name/phone → 400.
- [x] GET list returns array; GET `/:id` returns details; GET unknown id → 404.

### Step 8: Verify and finalize
Build, run, and update project tracking.
- [ ] `cd backend && npx tsc --noEmit` passes (and `npm run build`).
- [ ] Start backend, run `npm test` — customers suite green.
- [ ] Update ADD/CLAUDE.md customer endpoint status from Planned → Implemented.
- [ ] Set spec status to "Done" and feature status to "InProgress" while building.

## Acceptance Criteria coverage

| Criterion (spec) | Step |
|---|---|
| POST valid → 201 with id | 1, 4, 5, 7 |
| Duplicate email → 409 | 2, 4, 5, 7 |
| Missing/empty email → 400 | 3, 5, 7 |
| Missing/empty name → 400 | 3, 5, 7 |
| Missing/empty phone → 400 | 3, 5, 7 |
| GET list → all customers | 4, 5, 7 |
| GET by id → details | 4, 5, 7 |
| GET unknown id → 404 | 5, 7 |
| Log register/retrieve operations | 5 |
