# Launches Management Specification

- **Reference**: [PRD](../PRD.md) FR4, FR5.
- **Issue**: _to be created_
- **Status**: Released

## Problem Description

The platform needs to schedule and manage rocket launches so that customers can later book seats on them. Each launch is tied to an existing rocket and defines a mission, a future date, a price per seat, a minimum passenger threshold, and the number of seats offered for sale. Without launch management, agencies cannot commercialize trips and the seats offered cannot be validated against the rocket's physical capacity, risking overbooking and inconsistent pricing.

### User Stories

- As an **agency owner**, I want to **schedule launches for my rockets with pricing and passenger thresholds** so that I can plan and commercialize space trips.
- As an **agency owner**, I want to **update or cancel my scheduled launches** so that I can adjust pricing or remove launches that are no longer viable.
- As a **customer**, I want to **browse available launches with their details** so that I can choose a trip that fits my budget and schedule.

## Solution Overview

### User/App interface

RESTful CRUD endpoints under `/api/launches`:
- `GET /api/launches` - List all launches.
- `GET /api/launches/:id` - Get a launch by identifier.
- `POST /api/launches` - Schedule a new launch.
- `PUT /api/launches/:id` - Update an existing launch.
- `DELETE /api/launches/:id` - Delete a launch.

### Model and logic

A launch contains:
- `id`: unique identifier (UUID).
- `rocketId`: reference to an existing rocket.
- `mission`: mission name (non-empty string).
- `date`: scheduled launch date (ISO 8601 string, must be in the future).
- `pricePerSeat`: cost per passenger seat (positive number).
- `minPassengers`: minimum passengers required for launch to proceed (integer >= 1).
- `seatsOffered`: number of seats offered for sale (integer >= 1).

Validation rules (FR5):
- `rocketId` must reference an existing rocket.
- `seatsOffered` must not exceed the referenced rocket's `capacity`.
- `minPassengers` must not exceed `seatsOffered`.
- `date` must be a valid date in the future.
- `mission` must be a non-empty string.
- `pricePerSeat` must be a positive number.

### Persistence

In-memory `Map` storage, consistent with the existing rockets repository pattern. Seat availability is derived (not stored) and out of scope for this spec; it is handled by the bookings feature.

## Acceptance Criteria

- [x] WHEN a client sends a valid POST request with `rocketId`, `mission`, `date`, `pricePerSeat`, `minPassengers`, and `seatsOffered`, THE API SHALL create a new launch and return it with a unique identifier and status 201.
- [x] IF a client sends a POST request with a `rocketId` that does not reference an existing rocket, THEN THE API SHALL reject the request with a 400 validation error.
- [x] IF a client sends a POST request with `seatsOffered` exceeding the referenced rocket's `capacity`, THEN THE API SHALL reject the request with a 400 validation error indicating the capacity constraint.
- [x] IF a client sends a POST request with `minPassengers` greater than `seatsOffered`, or a non-future `date`, or an empty `mission`, or a non-positive `pricePerSeat`, THEN THE API SHALL reject the request with a 400 validation error.
- [x] WHEN a client sends a GET request to `/api/launches`, THE API SHALL return a list of all registered launches.
- [x] WHEN a client sends a GET request with an existing launch identifier, THE API SHALL return the details of that launch.
- [x] IF a client sends a GET, PUT, or DELETE request with a non-existent launch identifier, THEN THE API SHALL respond with a 404 not-found error.
- [x] WHEN a client sends a PUT request with valid updated data for an existing launch, THE API SHALL apply the same validation rules, update the launch, and return the modified resource.
- [x] WHEN a client sends a DELETE request with an existing launch identifier, THE API SHALL remove the launch and respond with status 204.
