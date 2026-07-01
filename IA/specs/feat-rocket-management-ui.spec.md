# Rocket Management UI Specification

- **Reference**: [PRD](../PRD.md) FR10 (builds on FR1, FR2). Umbrella: [Frontend Staged Delivery](./feat-frontend-staged-delivery.spec.md).
- **Issue**: _to be created_
- **Status**: Released

## Problem Description

The backend exposes full rocket CRUD over `/api/rockets` (FR1) with name, range, and capacity validation (FR2), and the frontend app shell (FR9) already provides routing, a typed API client, and shared loading/empty/error states. However, the Agency area is still a placeholder: agency owners have no screen to view their rocket inventory or to create, edit, and delete rockets. Without a UI they cannot manage rockets without calling the API directly, and validation feedback is invisible to end users.

This spec covers only the rocket management UI (FR10). The backend API, its validation rules, and the app shell are already implemented and out of scope.

### User Stories

- As an **agency owner**, I want to **see a list of all my rockets** so that I can review my current fleet at a glance.
- As an **agency owner**, I want to **create, edit, and delete rockets through a form** so that I can keep my inventory up to date without using the API directly.
- As an **agency owner**, I want to **see validation feedback on name, range, and capacity** so that I can correct invalid input before submitting.

## Solution Overview

### User/App interface

- A rockets screen within the Agency area, reachable from the app shell navigation.
- A list/table of rockets showing `name`, `range`, and `capacity`, plus per-row edit and delete actions.
- A "create rocket" action opening a form for `name`, `range` (selection limited to `suborbital`, `orbital`, `moon`, `mars`), and `capacity`.
- The same form, pre-filled, is reused to edit an existing rocket.
- A delete action with a confirmation step before removal.
- Reuse of the shared loading, empty, and error states from the app shell.
- Inline validation feedback shown next to the offending fields.
- Success feedback after create, edit, or delete.

### Model and logic

- All data access goes through the single typed `api-client` against `/api/rockets`, returning the discriminated `ApiResult<T>`.
- Frontend `Rocket`, `CreateRocketDto`, and `UpdateRocketDto` types mirror the backend DTOs; the API remains the single source of truth.
- The screen lists rockets via `GET /api/rockets`, creates via `POST`, updates via `PUT /api/rockets/:id`, and deletes via `DELETE /api/rockets/:id`.
- Client-side validation mirrors backend rules (non-empty `name`, `range` in the allowed set, integer `capacity` between 1 and 10) to give fast feedback, but server-side validation errors are surfaced as the authoritative response.
- No rocket business rules are duplicated or enforced beyond input validation feedback; the backend remains authoritative.

### Persistence

- No frontend persistence beyond ephemeral component/store state during a session.
- All rocket data is read from and written to the backend over HTTP/JSON against `/api/rockets`.

## Acceptance Criteria

- [x] WHEN the rockets screen loads, THE Frontend SHALL request `GET /api/rockets` and display each rocket's name, range, and capacity.
- [x] WHILE the rockets request is in progress, THE Frontend SHALL display the shared loading state.
- [x] WHERE no rockets exist, THE Frontend SHALL display the shared empty state.
- [x] WHEN an agency owner submits the create form with valid name, range, and capacity, THE Frontend SHALL send `POST /api/rockets` and add the created rocket to the list.
- [x] WHEN an agency owner submits the edit form for an existing rocket, THE Frontend SHALL send `PUT /api/rockets/:id` and reflect the updated values in the list.
- [x] WHEN an agency owner confirms deletion of a rocket, THE Frontend SHALL send `DELETE /api/rockets/:id` and remove the rocket from the list.
- [x] IF the form input violates name, range, or capacity rules, THEN THE Frontend SHALL display validation feedback next to the offending field and SHALL NOT send the request.
- [x] IF the API returns a validation or error response, THEN THE Frontend SHALL display the shared error state with a retry affordance and SHALL preserve the entered form values.
- [x] THE Frontend SHALL restrict the range input to the values `suborbital`, `orbital`, `moon`, and `mars`.
