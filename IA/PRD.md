# AstroBookings Product Requirements Document

AstroBookings is a backend API (with a companion Vue frontend) for offering and managing bookings for rocket launches. Agencies register rockets and schedule launches with pricing and passenger thresholds; customers book seats on those launches and are billed through a mock payment gateway.

## Vision and Scope

Provide a simple, well-structured platform that lets space agencies commercialize rocket launches and lets customers reserve seats on them. The product aims to demonstrate a clean, layered TypeScript/Express architecture with in-memory persistence, automatic structured logging, and end-to-end smoke testing.

**Target users:**
- **Agency owners** — register rockets, schedule launches, set pricing and minimum passenger thresholds, and manage the launch lifecycle.
- **Customers** — browse available launches and book one or more seats, subject to availability.

**Problems solved:** centralizes rocket inventory, launch scheduling, seat capacity enforcement, customer bookings, and billing in a single API, removing manual coordination and overbooking risk.

### Scope

In scope:
- CRUD management of rockets, with validation of name, range, and capacity.
- Scheduling and management of launches tied to rockets, with pricing and passenger thresholds.
- Customer management identified by email.
- Seat booking against launches, validated against available capacity.
- Mock payment processing on booking.
- Structured logging and a health check endpoint.
- A Vue frontend and Playwright smoke/API tests.

Out of scope:
- Persistent/external database storage (in-memory `Map` only).
- Real payment gateway integration (mock only).
- Authentication, authorization, and user accounts/roles.
- Launch status lifecycle automation beyond basic state transitions.

## Functional Requirements

### FR1 Rockets management
- **Description**: Provide full CRUD over rockets with name, range, and capacity validation via `/api/rockets`.
- **Priority**: High
- **Status**: Implemented

### FR2 Rocket validation rules
- **Description**: Enforce required non-empty `name`, `range` in (`suborbital`, `orbital`, `moon`, `mars`), and integer `capacity` between 1 and 10.
- **Priority**: High
- **Status**: Implemented

### FR3 Health check
- **Description**: Expose `GET /api/health` returning service status and timestamp.
- **Priority**: Medium
- **Status**: Implemented

### FR4 Launches management
- **Description**: Provide CRUD over launches under `/api/launches`, each tied to a rocket with date, mission, price per seat, minimum passengers, and seats offered.
- **Priority**: High
- **Status**: Implemented

### FR5 Launch validation rules
- **Description**: Validate that `rocketId` exists, `seats` does not exceed rocket capacity, `minPassengers` does not exceed `seats`, `date` is a valid future date, `mission` is non-empty, and `pricePerSeat` is positive.
- **Priority**: High
- **Status**: Implemented

### FR6 Customers management
- **Description**: Register and manage customers identified by email, with name and phone number.
- **Priority**: Medium
- **Status**: Implemented

### FR7 Seat bookings
- **Description**: Allow a customer to book one or more seats on a launch without exceeding available seats.
- **Priority**: High
- **Status**: Implemented

### FR8 Billing via mock payment gateway
- **Description**: Bill customers upon booking by processing payment through a mock gateway.
- **Priority**: Medium
- **Status**: Implemented

### FR9 Frontend application shell and API integration
- **Description**: Provide the Vue 3 + Vite application foundation: client-side routing, a shared layout with navigation between the agency and customer areas, a typed API client targeting `/api`, a service health indicator sourced from `GET /api/health`, and consistent loading, empty, and error states reused across screens.
- **Priority**: Low
- **Status**: Implemented

### FR10 Rocket management UI
- **Description**: Provide agency screens to list, create, edit, and delete rockets via `/api/rockets`, surfacing name, range, and capacity validation feedback (builds on FR1, FR2).
- **Priority**: Low
- **Status**: Implemented

### FR11 Launch management UI
- **Description**: Provide agency screens to list, create, edit, and delete launches via `/api/launches`, including rocket selection and validation feedback for mission, date, price per seat, minimum passengers, and seats offered (builds on FR4, FR5).
- **Priority**: Low
- **Status**: Implemented

### FR12 Launch catalog and availability browsing
- **Description**: Provide a customer-facing catalog that lists launches from `/api/launches` with mission, date, price per seat, and remaining seat availability, plus a launch detail view, with a sold-out indication when no seats remain. Launch read responses expose a derived read-only `seatsAvailable` field (seats offered minus seats booked) so availability is not recomputed in the frontend (builds on FR4, FR7 availability).
- **Priority**: Low
- **Status**: Implemented
- **Plan**: [feat-launch-catalog-browsing](./plans/feat-launch-catalog-browsing.plan.md)
- **Spec**: [feat-launch-catalog-browsing](./specs/feat-launch-catalog-browsing.spec.md)

### FR13 Customer booking flow
- **Description**: Provide a customer flow to register or identify a customer by email via `/api/customers` and book one or more seats on a launch via `/api/bookings`, showing the billing outcome and a booking confirmation (builds on FR6, FR7, FR8).
- **Priority**: Low
- **Status**: NotStarted

## Technical Requirements

### TR1 TypeScript + Express backend
- **Description**: Implement the API in TypeScript (~6.0) on Express 5 / Node >= 20 using ES modules and a layered router/repository/types structure.
- **Priority**: High
- **Status**: Implemented

### TR2 In-memory persistence
- **Description**: Store all entities in in-memory `Map` repositories following the established rockets repository pattern.
- **Priority**: High
- **Status**: Implemented

### TR3 Structured logging
- **Description**: Log requests, CRUD operations, and errors with format `[TIMESTAMP] [LEVEL] [CONTEXT] message`, configurable via `LOG_LEVEL`.
- **Priority**: Medium
- **Status**: Implemented

### TR4 CORS-enabled API
- **Description**: Enable CORS so the Vue frontend and external clients can consume the API.
- **Priority**: Medium
- **Status**: Implemented

### TR5 Playwright testing
- **Description**: Cover the API with Playwright smoke and endpoint tests run against a live backend.
- **Priority**: Medium
- **Status**: InProgress

### TR6 Unit testing
- **Description**: Cover backend logic (repositories, validators, utils, services) with fast, isolated Vitest unit tests colocated as `backend/src/**/*.test.ts`.
- **Priority**: Medium
- **Status**: InProgress
