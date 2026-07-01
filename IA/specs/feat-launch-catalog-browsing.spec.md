# Launch Catalog and Availability Browsing Specification

- **Reference**: [PRD](../PRD.md) FR12 (builds on FR4, FR5, FR7; depends on FR9 app shell). Requires a small backend enhancement to FR4/FR7 (see Solution Overview).
- **Issue**: _to be created_
- **Status**: Released

## Problem Description

Agencies can schedule launches through the management UI (FR11), but customers have no way to discover them. The customer area currently has no screen to browse the launch program, compare missions and prices, or see how many seats are still available before deciding to book. Remaining seat availability is only computed internally during booking validation and is never exposed for browsing. Without a customer-facing catalog and a detail view, customers cannot evaluate launches, and the booking flow (FR13) has no entry point.

### User Stories

- As a customer, I want to **browse all available launches with mission, date, price, and remaining seats** so that I can find a launch worth booking.
- As a customer, I want to **open a single launch to see its full details and current availability** so that I can decide before starting a booking.
- As a customer, I want to **clearly see when a launch is sold out** so that I do not attempt to book an unavailable launch.

## Solution Overview

### User/App interface

- A new customer route (e.g. `/customer/launches`) reachable from the existing customer navigation, plus a detail route (e.g. `/customer/launches/:id`).
- A catalog list showing, per launch: mission, associated rocket (by name), date, price per seat, and remaining seat availability, with a clear "sold out" indication when no seats remain.
- A launch detail view showing the same fields plus minimum passengers and total seats offered.
- Reuse the shared shell primitives: `use-async`, `LoadingState`, `EmptyState`, `ErrorState`, and the typed `api-client`.
- This spec is read-only browsing; the booking action itself is FR13.

### Model and logic

- Frontend types mirror backend launch read DTOs; the API remains the single source of truth.
- Remaining availability must be served by the API, not recomputed in the frontend (project rule: no business rules duplicated client-side).
- **Backend enhancement (in scope for FR12)**: extend launch read responses (`GET /api/launches` and `GET /api/launches/:id`) with a derived, read-only `seatsAvailable` field equal to `seatsOffered` minus seats already booked, reusing the existing availability derivation (`bookings.service.getRemainingSeats`). The field is computed on read; it is not stored and not accepted on create/update.
- The catalog resolves each launch's rocket to display the rocket name.
- A launch is considered "sold out" WHEN `seatsAvailable` equals zero.

### Persistence

- No new persistence. Launch and booking data continue to live in the existing in-memory `Map` repositories. The catalog reads from the existing `/api/launches` and `/api/launches/:id` endpoints (enhanced with the derived `seatsAvailable` field) and `/api/rockets` for rocket names. No new endpoints are introduced.

## Acceptance Criteria

- [ ] WHEN a customer opens the launch catalog THE Launch Catalog SHALL request launches from `/api/launches` and display each launch's mission, rocket name, date, price per seat, and remaining seats available.
- [ ] WHILE the catalog request is in progress THE Launch Catalog SHALL show the shared loading state.
- [ ] IF the catalog request fails THEN THE Launch Catalog SHALL show the shared error state with a retry action.
- [ ] WHEN no launches exist THE Launch Catalog SHALL show the shared empty state.
- [ ] WHERE a launch has zero remaining seats THE Launch Catalog SHALL mark that launch as sold out.
- [ ] WHEN a customer selects a launch from the catalog THE Launch Catalog SHALL open the launch detail view for that launch.
- [ ] WHEN the launch detail view loads THE Launch Catalog SHALL request `GET /api/launches/:id` and display mission, rocket name, date, price per seat, minimum passengers, seats offered, and remaining seats available.
- [ ] THE launch read responses (`GET /api/launches` and `GET /api/launches/:id`) SHALL include a derived read-only `seatsAvailable` field equal to seats offered minus seats already booked.
- [ ] IF a launch detail request targets a non-existent launch THEN THE Launch Catalog SHALL show the shared error state.
