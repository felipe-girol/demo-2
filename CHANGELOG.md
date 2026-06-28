# Changelog

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
