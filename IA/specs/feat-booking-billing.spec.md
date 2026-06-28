# Booking Billing via Mock Payment Gateway Specification

- **Reference**: [PRD](../../IA/PRD.md) FR8 (depends on FR7, FR4, FR6).
- **Issue**: _to be created_
- **Status**: Released

## Problem Description

Customers can book seats on a launch (FR7), but bookings are never billed. Every
booking is persisted with a `pending` payment status and the charge is never
attempted. As a result the booking flow is incomplete: an agency cannot tell
whether a booking is paid, and a customer receives no confirmation that their
payment succeeded. The product needs to charge the booking total through the
mock payment gateway at creation time and record the outcome on the booking.

### User Stories

- As a customer, I want to **be charged the correct total when I book seats** so that my reservation is confirmed as paid.
- As an agency owner, I want to **see the payment status of each booking** so that I know which reservations are settled.
- As a customer, I want to **know immediately if my payment was declined** so that I can retry or use another method.

## Solution Overview

### User/App interface

- No new endpoints. Billing is triggered inside the existing `POST /api/bookings`.
- The booking returned by `POST /api/bookings` includes the billing outcome:
  - `totalPrice`: seats x launch `pricePerSeat`.
  - `paymentStatus`: `paid` when the charge succeeds, `failed` when it is declined.
  - A payment reference identifying the gateway transaction.
- A successful booking responds `201 Created` with the persisted booking.
- A declined payment responds with a client error and the reason, and no booking
  is persisted (no seats are reserved for an unpaid booking).
- `GET /api/bookings` and `GET /api/bookings/:id` expose the stored `paymentStatus`.

### Model and logic

- Introduce a mock payment-gateway adapter exposing a single `charge(amount)`
  operation that returns a deterministic result: an outcome (`paid`/`failed`)
  and a payment reference.
- The mock is deterministic for testing: a valid positive amount is charged
  successfully; a non-positive amount is declined.
- The booking service, after computing `totalPrice` and confirming seat
  availability, calls the gateway:
  - On success: persist the booking with `paymentStatus = paid` and the reference.
  - On decline: do not persist the booking; return a billing-failed result.
- Billing happens only after launch existence, customer existence, and seat
  availability checks pass.
- Each charge attempt and its outcome are logged via the shared logger.

### Persistence

- No new store. The existing in-memory bookings `Map` keeps the booking record
  with its `paymentStatus` and payment reference.
- Failed payments are not persisted, so the derived seat availability is
  unaffected by declined attempts.

## Acceptance Criteria

- [ ] WHEN a booking is created with valid data THE Booking Service SHALL charge the launch `pricePerSeat` multiplied by `seats` through the payment gateway.
- [ ] WHEN the payment gateway returns a successful charge THE Booking Service SHALL persist the booking with `paymentStatus` set to `paid`.
- [ ] WHEN the payment gateway returns a successful charge THE Booking Service SHALL store the gateway payment reference on the booking.
- [ ] WHEN a booking is created and the charge succeeds THE API SHALL respond `201 Created` with the persisted booking including `paymentStatus` and `totalPrice`.
- [ ] IF the payment gateway declines the charge THEN THE Booking Service SHALL NOT persist the booking.
- [ ] IF the payment gateway declines the charge THEN THE API SHALL respond with a client error and a message describing the payment failure.
- [ ] THE Booking Service SHALL attempt the charge only after launch existence, customer existence, and seat availability checks pass.
- [ ] WHEN a charge is attempted THE Booking Service SHALL log the amount and the resulting payment outcome.
- [ ] WHEN a booking is retrieved via `GET /api/bookings/:id` THE API SHALL return its stored `paymentStatus`.
