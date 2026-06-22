# Seat Bookings Specification

- **Reference**: [PRD](../PRD.md) FR7.
- **Issue**: _to be created_
- **Status**: Released

## Problem Description

The platform lets agencies schedule launches and register customers, but customers cannot yet reserve seats on a launch. Without seat bookings, the core commercial transaction is missing and there is no enforcement of the launch's seat capacity, risking overbooking. The system needs to let a customer book one or more seats on an existing launch while guaranteeing that the total booked seats never exceed the seats offered.

> Billing the booking through the mock payment gateway is covered separately by FR8 and is out of scope for this spec.

### User Stories

- As a **customer**, I want to **book one or more seats on a launch** so that I can reserve my place on a space trip.
- As a **customer**, I want to **be prevented from booking more seats than are available** so that I never pay for seats that do not exist.
- As an **agency owner**, I want to **see the bookings made on each launch** so that I can track demand and remaining capacity.

## Solution Overview

### User/App interface

RESTful endpoints under `/api/bookings`:
- `GET /api/bookings` - List all bookings (optionally filtered by `launchId`).
- `GET /api/bookings/:id` - Get a booking by identifier.
- `POST /api/bookings` - Create a booking for a launch and customer.

Create request body:
- `launchId`: identifier of the target launch.
- `customerId`: identifier of the booking customer.
- `seats`: number of seats to reserve.

### Model and logic

A booking contains:
- `id`: unique identifier (UUID).
- `launchId`: reference to an existing launch.
- `customerId`: reference to an existing customer.
- `seats`: number of reserved seats (integer >= 1).
- `totalPrice`: derived as `seats * launch.pricePerSeat`.
- `paymentStatus`: payment state (defaults to a pending/unbilled value; billing handled by FR8).
- `createdAt`: creation timestamp (ISO 8601 string).

Validation and business rules:
- `launchId` must reference an existing launch.
- `customerId` must reference an existing customer.
- `seats` must be an integer >= 1.
- `seats` must not exceed the launch's remaining available seats.
- Remaining available seats = launch `seatsOffered` minus the sum of `seats` across that launch's existing bookings (derived, not stored).

### Persistence

In-memory `Map` storage following the established repository pattern. Bookings are stored as a private `Map<string, Booking>`. Seat availability is computed on demand from the bookings of a launch, keeping a single source of truth.

## Acceptance Criteria

- [x] WHEN a client sends a valid POST request with `launchId`, `customerId`, and `seats`, THE API SHALL create a booking and return it with a unique identifier, computed `totalPrice`, `createdAt`, and status 201.
- [x] WHEN THE API creates a booking, THE API SHALL set `totalPrice` to `seats` multiplied by the launch's `pricePerSeat`.
- [x] IF a client sends a POST request with a `launchId` that does not reference an existing launch, THEN THE API SHALL respond with a 404 not-found error.
- [x] IF a client sends a POST request with a `customerId` that does not reference an existing customer, THEN THE API SHALL respond with a 404 not-found error.
- [x] IF a client sends a POST request with `seats` that is not an integer greater than or equal to 1, THEN THE API SHALL reject the request with a 400 validation error.
- [x] IF a client sends a POST request with `seats` exceeding the launch's remaining available seats, THEN THE API SHALL reject the request with a 409 conflict error indicating insufficient availability.
- [x] WHEN a client sends a GET request to `/api/bookings`, THE API SHALL return a list of all bookings.
- [x] WHERE a `launchId` query parameter is provided on `GET /api/bookings`, THE API SHALL return only the bookings of that launch.
- [x] IF a client sends a GET request with a non-existent booking identifier, THEN THE API SHALL respond with a 404 not-found error.
