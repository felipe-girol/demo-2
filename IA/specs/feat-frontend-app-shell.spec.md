# Frontend Application Shell and API Integration Specification

- **Reference**: [PRD](../PRD.md) FR9. Umbrella: [Frontend Staged Delivery](./feat-frontend-staged-delivery.spec.md) Stage 1.
- **Issue**: _to be created_
- **Status**: Released

## Problem Description

The backend exposes a complete REST API, but the Vue frontend is still the default Vite scaffold (`HelloWorld`). Before any feature screen (rockets, launches, catalog, bookings) can be built, the application needs a foundation: client-side routing, a shared layout with navigation between the agency and customer areas, a single typed API client pointing at `/api`, a visible service health indicator, and consistent loading, empty, and error states that every later screen reuses. Without this shell, each feature stage would re-invent navigation, data fetching, and feedback patterns, producing inconsistent UX and duplicated code.

This spec covers only the shell (FR9). The backend API and its rules are already implemented and out of scope; feature screens (FR10–FR13) are delivered in later stages.

### User Stories

- As a **user**, I want to **move between the agency and customer areas from a shared layout** so that I can reach any part of the app without manual URLs.
- As a **user**, I want to **see whether the API is reachable** so that I know if the app can load and save data.
- As a **developer**, I want **one typed API client and shared loading/empty/error components** so that every feature screen consumes the API and gives feedback consistently.

## Solution Overview

### User/App interface

- A Vue 3 + Vite single-page application with client-side routing (Vue Router).
- A shared layout (header/nav + content outlet) rendered around every route.
- Top-level navigation linking to the **Agency** area and the **Customer** area, plus a Home/landing route.
- A service **health indicator** in the layout showing reachable/unreachable, derived from `GET /api/health`.
- Reusable presentational states: **loading**, **empty**, and **error**, available to all routes.
- A placeholder for each area (agency, customer) so navigation resolves to real routes before feature screens land.
- A fallback (not-found) route for unknown paths.

### Model and logic

- A single typed API client wraps HTTP/JSON calls against the base path `/api`.
- The client exposes a typed health check and a generic request helper that returns typed data or a normalized error.
- Frontend types mirror backend DTOs but the API remains the single source of truth; no business rules are duplicated in the shell.
- The health indicator polls or fetches `GET /api/health` on app start; result drives the indicator state.
- Loading/empty/error are shared components or a small composable used uniformly by feature screens.

### Persistence

- No frontend persistence beyond ephemeral component/store state during a session.
- All data is fetched over HTTP/JSON with CORS enabled; the base URL targets the backend `/api`.

## Acceptance Criteria

- [x] WHERE the application is loaded, THE Frontend SHALL render a shared layout containing navigation to the agency area and the customer area.
- [x] WHEN a user selects a navigation link, THE Frontend SHALL route client-side to the target area without a full page reload.
- [x] WHEN the application starts, THE Frontend SHALL request `GET /api/health` and display a service status indicator reflecting the response.
- [x] IF the `GET /api/health` request fails or times out, THEN THE Frontend SHALL display the indicator in an unreachable state.
- [x] THE Frontend SHALL expose a single typed API client configured with the `/api` base path that all data access uses.
- [x] WHILE an API request is in progress, THE Frontend SHALL display a reusable loading state.
- [x] IF an API request fails, THEN THE Frontend SHALL display a reusable error state with a retry affordance.
- [x] WHERE a screen has no data to show, THE Frontend SHALL display a reusable empty state.
- [x] WHEN a user navigates to an unknown path, THE Frontend SHALL display a not-found route within the shared layout.
