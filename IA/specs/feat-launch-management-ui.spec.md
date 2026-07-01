# Launch Management UI Specification

- **Reference**: [PRD](../PRD.md) FR11 (builds on FR4, FR5; depends on FR1/FR2 rockets, FR9 app shell, FR10 rocket UI).
- **Issue**: _to be created_
- **Status**: Released

## Problem Description

Agency owners can manage rockets through the UI (FR10), but launches can only be created or maintained by calling the `/api/launches` endpoints directly. There is no screen for an agency to schedule a launch against a rocket, set its mission, date, price, passenger thresholds, and seat count, or to review, edit, and cancel existing launches. Without a launch management UI, agencies cannot operate the core scheduling workflow that customer-facing browsing and booking (FR12, FR13) depend on.

### User Stories

- As an agency owner, I want to **see all scheduled launches with their key details** so that I can review the current launch program at a glance.
- As an agency owner, I want to **schedule a new launch by selecting a rocket and entering its mission, date, price, and seat details** so that I can offer it for booking.
- As an agency owner, I want to **edit or delete an existing launch with validation feedback** so that I can keep the program accurate and remove cancelled launches.

## Solution Overview

### User/App interface

- A new agency route (e.g. `/agency/launches`) reachable from the existing agency navigation.
- A launch list showing, per launch: mission, associated rocket (by name), date, price per seat, minimum passengers, and seats offered, plus edit and delete actions.
- A launch form (create and edit) with fields:
  - Rocket: selection from existing rockets (`/api/rockets`), shown by name.
  - Mission: text.
  - Date: future date/time.
  - Price per seat: positive number.
  - Minimum passengers: integer.
  - Seats offered: integer.
- Inline, per-field validation feedback mirroring backend rules before submit.
- Reuse the shared shell primitives: `use-async`, `LoadingState`, `EmptyState`, `ErrorState`, `ConfirmDialog` for delete, and the typed `api-client`.
- Delete requires a confirmation step.

### Model and logic

- Frontend types mirror backend launch DTOs (`Launch`, `CreateLaunchDto`, `UpdateLaunchDto`); the API remains the single source of truth.
- A pure form-validation module mirrors backend rules (FR5):
  - `rocketId` references an existing rocket.
  - `seatsOffered` is an integer that does not exceed the selected rocket's capacity.
  - `minPassengers` is an integer that does not exceed `seatsOffered`.
  - `date` is a valid future date.
  - `mission` is a non-empty string.
  - `pricePerSeat` is a positive number.
- The launch list resolves each launch's rocket to display the rocket name.
- Server-side validation errors returned by the API are surfaced in the form.
- No business rules are duplicated as authority; client validation only improves feedback, and the API decision is final.

### Persistence

- No new persistence. All data is read from and written to the existing backend `/api/launches` (and `/api/rockets` for selection) endpoints, backed by the in-memory `Map` repositories. No new endpoints are required.

## Acceptance Criteria

- [x] WHEN the agency user opens the launches screen THE Launch Management UI SHALL request launches from `/api/launches` and display each launch's mission, rocket name, date, price per seat, minimum passengers, and seats offered.
- [x] WHILE the launches request is in progress THE Launch Management UI SHALL show the shared loading state.
- [x] IF the launches request fails THEN THE Launch Management UI SHALL show the shared error state with a retry action.
- [x] WHEN no launches exist THE Launch Management UI SHALL show the shared empty state.
- [x] WHEN the agency user opens the launch form THE Launch Management UI SHALL offer rocket selection populated from `/api/rockets`.
- [x] IF any field violates the launch validation rules THEN THE Launch Management UI SHALL show field-specific validation messages and SHALL NOT submit the form.
- [x] WHEN the agency user submits a valid new launch THE Launch Management UI SHALL create it via `POST /api/launches` and SHALL show the new launch in the list.
- [x] WHEN the agency user submits a valid edit THE Launch Management UI SHALL update it via `PUT /api/launches/:id` and SHALL reflect the updated values in the list.
- [x] WHEN the agency user confirms deletion of a launch THE Launch Management UI SHALL delete it via `DELETE /api/launches/:id` and SHALL remove it from the list.
