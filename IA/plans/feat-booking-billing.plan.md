# Implementation Plan for feat-booking-billing

Implements FR8 (Billing via mock payment gateway) per
[spec](../specs/feat-booking-billing.spec.md) and [ADD](../ADD.md) (ADR-4: mock
payment gateway via adapter). Completes the booking flow started in FR7 by charging
the booking total through a new `utils/payment-gateway.ts` adapter at creation time
and recording the outcome on the booking. No new endpoints: billing is triggered
inside the existing `POST /api/bookings`.

> Scope is the **backend only**. `GET /api/bookings` and `GET /api/bookings/:id`
> already return the stored booking, so they expose `paymentStatus`/`paymentReference`
> automatically once the entity carries them — no router changes for reads.

## Design decisions

- **New adapter `utils/payment-gateway.ts`** (referenced by ADD/CLAUDE.md but not yet
  created). Exposes a single deterministic `charge(amount)` operation returning a
  discriminated result: `{ outcome: "paid"; reference }` for a positive amount,
  `{ outcome: "failed"; reason }` for a non-positive amount. Each attempt logs the
  amount and outcome via the shared `logger` (context `"PaymentGateway"`). Keeping
  the contract a discriminated union lets a real provider replace the mock later.
- **Entity change**: add `paymentReference: string` to `Booking`. Persisted bookings
  are always `paid` (declined charges are never stored), so `DEFAULT_PAYMENT_STATUS`
  (`"pending"`, an FR7 placeholder) is removed; `paymentStatus` is set from the
  gateway outcome. The `PaymentStatus` type is kept (`"pending" | "paid" | "failed"`)
  unchanged for compatibility.
- **Charge ordering (AC)**: the service charges only **after** launch existence,
  customer existence, and seat-availability checks pass — billing is the last step
  before persistence, so no charge is attempted for a request that would be rejected.
- **Decline does not persist (AC)**: on `failed` the service returns a new
  `payment-failed` result and does **not** call `repository.create`, leaving derived
  seat availability unaffected by declined attempts.
- **New error mapping (402)**: a declined charge is a client error. Add
  `sendPaymentRequired(res, message)` (HTTP **402 Payment Required**, shape
  `{ error }`) to `utils/error-handler.ts`, consistent with existing senders. The
  router maps the service `payment-failed` result to it.
- **Testability of the decline branch**: with valid data `totalPrice = seats *
  pricePerSeat` is always positive (validation enforces positive `pricePerSeat` and
  `seats >= 1`), so the mock never declines through the public API. The decline path
  is therefore covered by a **unit test that mocks `charge`** (via `vi.mock`) to
  return `failed`, asserting no booking is persisted and the `payment-failed` result;
  the gateway's own decline rule is covered by a direct adapter unit test. Playwright
  E2E covers only the happy `paid` path.
- **ERM update**: add the `paymentReference` attribute (and clarify `paymentStatus`)
  to the `Booking` entity in `IA/ERM.md`, keeping the model in sync with the spec.

### Step 1: Update the data model (ERM)
Reflect the billing outcome on the Booking entity.
- [ ] In `IA/ERM.md`, add `paymentReference` to the `Booking` attribute list and the mermaid `BOOKING` block.
- [ ] Note that persisted `paymentStatus` is `paid` (declined charges are not persisted).

### Step 2: Implement the mock payment-gateway adapter
Create the deterministic billing adapter.
- [ ] Add `backend/src/utils/payment-gateway.ts`.
- [ ] Define `PaymentResult = { outcome: "paid"; reference: string } | { outcome: "failed"; reason: string }`.
- [ ] Implement `charge(amount: number): PaymentResult`: positive amount → `paid` with a `crypto.randomUUID` reference; non-positive → `failed` with a reason.
- [ ] Log the amount and outcome via `logInfo`/`logWarn` with context `"PaymentGateway"`.

### Step 3: Extend the booking type
Carry the gateway reference on the persisted entity.
- [ ] In `backend/src/types/bookings.type.ts`, add `paymentReference: string` to `Booking`.
- [ ] Remove the now-unused `DEFAULT_PAYMENT_STATUS` constant (FR7 placeholder).
- [ ] Keep `PaymentStatus` and `CreateBookingDto` unchanged.

### Step 4: Bill inside the booking service
Charge after all checks, persist on success, reject on decline.
- [ ] In `backend/src/bookings/bookings.service.ts`, after the availability check compute `totalPrice` and call `charge(totalPrice)`.
- [ ] On `paid`: `repository.create({ ...dto, totalPrice, paymentStatus: "paid", paymentReference, createdAt })`; log and return `{ status: "ok", booking }`.
- [ ] On `failed`: do not persist; return new variant `{ status: "payment-failed"; message }` and add it to `CreateBookingResult`.
- [ ] Keep launch/customer/availability checks before the charge (drop the `DEFAULT_PAYMENT_STATUS` import).

### Step 5: Map the decline to a 402 in the HTTP layer
Wire the new result to a client error.
- [ ] Add `sendPaymentRequired(res, message)` (402, `{ error }`) to `backend/src/utils/error-handler.ts`.
- [ ] In `backend/src/bookings/bookings.router.ts`, map `result.status === "payment-failed"` to `sendPaymentRequired`; keep `not-found`→404, `conflict`→409, `ok`→201.

### Step 6: Update unit tests (Vitest)
Cover the gateway and the new service branches.
- [ ] Add `backend/src/utils/payment-gateway.test.ts`: positive amount → `paid` with a reference; non-positive → `failed`.
- [ ] Update `backend/src/bookings/bookings.service.test.ts`: happy path now asserts `paymentStatus === "paid"` and a non-empty `paymentReference`.
- [ ] Add a service test that `vi.mock`s the gateway to return `failed`: asserts `payment-failed` result and that the booking is not persisted (`findAll` count unchanged / `findByLaunch` empty).

### Step 7: Update Playwright acceptance tests (E2E)
Validate the billed happy path over HTTP.
- [ ] In `tests/bookings.spec.ts`, change the POST-valid expectation from `paymentStatus === "pending"` to `"paid"` and assert a non-empty `paymentReference`.
- [ ] Add a `GET /api/bookings/:id` assertion that the stored `paymentStatus` is `paid`.

### Step 8: Verify and finalize
Build, test, and update project tracking.
- [ ] `cd backend && npx tsc --noEmit` and `npm run build` pass; `npm run test` (Vitest) green.
- [ ] Start backend, run `npm test` — bookings Playwright suite green.
- [ ] Update `IA/ADD.md`: payment-gateway adapter no longer "(new)", note `charge` returns a reference; FR8 marked Implemented where applicable.
- [ ] Update `CLAUDE.md` bookings endpoint note (billing via FR8 now implemented).
- [ ] Set spec status "Planned" → "Released"; PRD FR8 "InProgress" → "Implemented".

## Acceptance Criteria coverage

| Criterion (spec) | Step |
|---|---|
| Charge `pricePerSeat * seats` through the gateway on valid booking | 2, 4, 6 |
| On success persist booking with `paymentStatus = paid` | 3, 4, 6 |
| On success store the gateway payment reference | 2, 3, 4, 6 |
| 201 Created with persisted booking incl. `paymentStatus`/`totalPrice` | 4, 5, 7 |
| On decline do NOT persist the booking | 4, 6 |
| On decline respond with client error + failure message | 5, 6 |
| Charge only after launch/customer/availability checks pass | 4, 6 |
| Log amount and resulting outcome on each charge attempt | 2 |
| `GET /api/bookings/:id` returns stored `paymentStatus` | 3, 7 |
