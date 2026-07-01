# Frontend Staged Delivery Specification

- **Reference**: [PRD](../PRD.md) FR9, FR10, FR11, FR12, FR13.
- **Issue**: _to be created_
- **Status**: Draft

## Problem Description

The backend exposes a complete REST API (rockets, launches, customers, bookings, and health), but the Vue frontend is still only the default Vite scaffold (a `HelloWorld` component). The original FR9 bundled the entire user interface into a single requirement, which is too large to plan, deliver, or acceptance-test incrementally. We need to split the frontend into independently shippable stages, each mapped to existing endpoints, so every stage delivers a working slice of value that can be tested on its own.

This spec is the umbrella that defines the staging; the backend API and its rules are already implemented and out of scope.

### User Stories

- As an **agency owner**, I want to **manage rockets and launches from a UI** so that I do not have to call the API by hand.
- As a **customer**, I want to **browse available launches and book seats from a UI** so that I can reserve a trip easily.
- As a **product owner**, I want the **frontend delivered in testable stages** so that I can release and validate value incrementally.

## Solution Overview

### User/App interface

A Vue 3 + Vite single-page application with client-side routing, consuming the API under `/api`. Delivery is split into five stages aligned with the PRD requirements:

- **Stage 1 — Application shell (FR9)**: shared layout, navigation between agency and customer areas, a typed API client, a health indicator from `GET /api/health`, and reusable loading/empty/error states.
- **Stage 2 — Rocket management (FR10)**: agency screens listing rockets from `/api/rockets` with create, edit, and delete actions and validation feedback.
- **Stage 3 — Launch management (FR11)**: agency screens listing launches from `/api/launches` with create, edit, and delete actions, rocket selection, and validation feedback.
- **Stage 4 — Launch catalog (FR12)**: customer-facing list and detail of launches from `/api/launches` showing mission, date, price per seat, and remaining available seats.
- **Stage 5 — Booking flow (FR13)**: customer flow that identifies or registers a customer by email via `/api/customers`, books seats via `/api/bookings`, and displays the billing outcome and a confirmation.

Each stage is independently demonstrable and acceptance-testable.

### Model and logic

- The frontend mirrors the backend DTOs (rocket, launch, customer, booking) for display and form binding.
- The API is the single source of truth; the frontend does not duplicate or re-implement business rules.
- Forms may pre-validate inputs against the documented rules for fast feedback, but the server remains authoritative and its validation/conflict responses are surfaced to the user.
- Remaining seat availability is shown as derived, read-only data returned by the API.

### Persistence

- No frontend persistence beyond ephemeral component or store state during a session.
- All data is fetched from and written to the API over HTTP/JSON with CORS enabled.

## Acceptance Criteria

- [ ] WHERE the application is loaded, THE Frontend SHALL render a shared layout that provides navigation to both the agency area and the customer area.
- [ ] WHEN the application starts, THE Frontend SHALL request `GET /api/health` and display a service status indicator reflecting the response.
- [ ] WHILE an API request is in progress, THE Frontend SHALL display a loading state, and IF the request fails THEN THE Frontend SHALL display an error message.
- [ ] WHEN an agency owner opens the rockets screen, THE Frontend SHALL list rockets from `/api/rockets` and provide create, edit, and delete actions.
- [ ] IF a rocket form submission violates the name, range, or capacity rules, THEN THE Frontend SHALL display the validation errors returned by the API without creating or updating the rocket.
- [ ] WHEN an agency owner opens the launches screen, THE Frontend SHALL list launches from `/api/launches` and provide create, edit, and delete actions with selection of an existing rocket.
- [ ] WHEN a customer opens the catalog, THE Frontend SHALL list launches from `/api/launches` showing mission, date, price per seat, and remaining available seats.
- [ ] WHEN a customer submits a booking, THE Frontend SHALL identify or register the customer by email via `/api/customers`, create the booking via `/api/bookings`, and display the billing outcome and a confirmation.
- [ ] IF a booking is rejected for insufficient availability or declined billing, THEN THE Frontend SHALL display the corresponding error and SHALL NOT display a booking confirmation.
