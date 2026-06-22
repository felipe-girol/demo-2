# AstroBookings Architectural Design Document

AstroBookings is a backend API (with a companion Vue frontend) for offering and managing bookings for rocket launches. Agencies register rockets and schedule launches with pricing and passenger thresholds; customers book seats and are billed through a mock payment gateway. This document defines the architecture that realizes the PRD using a clean, layered TypeScript/Express design with in-memory persistence.

### Table of Contents

- [Stack and tooling](#stack-and-tooling)
  - [Technology Stack](#technology-stack)
  - [Development Tools](#development-tools)
- [Systems Architecture](#systems-architecture)
- [Software Architecture](#software-architecture)
  - [Layered Modules](#layered-modules)
  - [Domain Model](#domain-model)
  - [Cross-Cutting Concerns](#cross-cutting-concerns)
  - [Data Flow](#data-flow)
  - [Target Folder Structure](#target-folder-structure)
- [Architecture Decisions Record (ADR)](#architecture-decisions-record-adr)

## Stack and tooling

### Technology Stack

- **Language**: TypeScript ~6.0 (ES modules, strict typing).
- **Backend runtime**: Node.js >= 20.
- **Backend framework**: Express 5.
- **Frontend**: Vue 3.5 + Vite 6.
- **Persistence**: In-memory `Map` repositories (no external database).
- **Security**: CORS enabled (no auth/authorization in scope).
- **Testing**: Playwright (smoke + API tests against a live backend) and Vitest (fast, isolated backend unit tests for repositories, validators, and utils).
- **Logging**: Custom structured logger writing to `console` (stdout/stderr).
- **IDs**: `node:crypto` `randomUUID`.

### Development Tools

- **Editor/IDE**: VS Code (recommended).
- **Package manager**: npm (separate manifests for root, backend, frontend).
- **Build**: `tsc` for backend, Vite for frontend.
- **CI/CD**: Not in scope; tests run locally against a running backend.

Workflow:

```bash
# Install
cd backend && npm install
cd frontend && npm install
npm install                 # root: Playwright

# Develop
cd backend && npm run dev   # API on :3000 (hot reload)
cd frontend && npm run dev  # Vue dev server

# Build
cd backend && npm run build
cd frontend && npm run build

# Test (backend must be running)
npm test
npm run test:smoke

# Unit test backend (Vitest, no live server)
cd backend && npm run test       # single run
cd backend && npm run test:dev   # watch mode
```

## Systems Architecture

AstroBookings is a small monorepo split into three deployables/runnables: an Express API, a Vue SPA, and a Playwright test suite. The API is the single source of truth; the SPA and tests are HTTP clients. The API holds all state in process memory and bills through an internal mock payment gateway (an adapter, not a real external system).

```text
                    ┌─────────────────────────────────────────────┐
                    │                  Clients                     │
                    │  ┌───────────────┐   ┌────────────────────┐  │
                    │  │  Vue 3 SPA    │   │ Playwright tests   │  │
                    │  │ (browser)     │   │ (CI/local)         │  │
                    │  └──────┬────────┘   └─────────┬──────────┘  │
                    └─────────┼──────────────────────┼─────────────┘
                              │   HTTP/JSON (CORS)    │
                              ▼                       ▼
                    ┌─────────────────────────────────────────────┐
                    │            AstroBookings API (Express 5)     │
                    │  ┌──────────────────────────────────────┐    │
                    │  │ Middleware: CORS, json, requestLogger │    │
                    │  └──────────────────────────────────────┘    │
                    │  ┌──────────────────────────────────────┐    │
                    │  │ Root router (/api) + health           │    │
                    │  ├──────────────────────────────────────┤    │
                    │  │ Feature routers (controllers)         │    │
                    │  │  rockets · launches · customers ·     │    │
                    │  │  bookings                             │    │
                    │  ├──────────────────────────────────────┤    │
                    │  │ Services (domain rules, cross-entity) │    │
                    │  ├──────────────────────────────────────┤    │
                    │  │ Repositories (in-memory Map<string,T>)│    │
                    │  └──────────────────────────────────────┘    │
                    │  Shared: validation · error-handler ·         │
                    │  logger · payment-gateway adapter             │
                    └─────────────────────────────────────────────┘
```

Main components and interactions:

- **Vue SPA / Playwright** → call REST endpoints under `/api` over HTTP+JSON.
- **Express app (`main.ts`)** → wires global middleware (CORS, JSON body, request logger) and mounts the root router.
- **Root router (`routes/index.ts`)** → exposes `/health` and delegates each resource to a feature router.
- **Feature routers** → parse/validate input, orchestrate via services/repositories, format responses, and emit logs.
- **Repositories** → own a private `Map` per entity and expose CRUD functions.
- **Mock payment gateway** → an adapter invoked by the booking service to simulate billing.

## Software Architecture

The system follows a **functional layered architecture**. Each feature is a self-contained module exposing pure functions; there are no classes. Composition and small single-purpose functions are favored over inheritance, matching the project's clean-code rules.

### Layered Modules

Per feature (`rockets`, `launches`, `customers`, `bookings`):

1. **Router (controller)** — `*.router.ts`: HTTP concern only. Validates request, maps DTOs, calls service/repository, sends responses, logs operations.
2. **Service** — `*.service.ts`: domain logic spanning entities (e.g. seat-availability checks, billing on booking). Introduced when a feature needs more than trivial CRUD (launches, bookings). Simple CRUD features (rockets) may skip the service and call the repository directly, as today.
3. **Repository** — `*.repository.ts`: in-memory `Map<string, Entity>` with `findAll`, `findById`, `create`, `update`, `remove`.
4. **Types** — `types/*.type.ts`: `Entity`, `Create*Dto`, `Update*Dto`, enums via `as const`, and domain constants.

### Domain Model

```text
Rocket 1───* Launch *───* Booking *───1 Customer
                              │
                              └── Payment (mock, embedded in Booking)
```

- **Rocket** — `{ id, name, range, capacity }`. `range ∈ {suborbital, orbital, moon, mars}`, `capacity ∈ [1,10]`. (Implemented.)
- **Launch** — `{ id, rocketId, mission, date, pricePerSeat, minPassengers, seatsOffered }`. Bound to an existing rocket; `seatsOffered ≤ rocket.capacity`, `minPassengers ≤ seatsOffered`, future `date`, non-empty `mission`, positive `pricePerSeat`. (Implemented.)
- **Customer** — `{ id, email, name, phone }`. Identified/looked up by unique `email`.
- **Booking** — `{ id, launchId, customerId, seats, totalPrice, paymentStatus, createdAt }`. `seats ≤` remaining available seats on the launch.

Seat availability is **derived** (launch `seatsOffered` minus sum of confirmed booking `seats`) rather than stored, keeping a single source of truth.

### Cross-Cutting Concerns

- **Validation** (`utils/validation.ts` pattern): per-field `FieldValidator` functions composed into `validateCreate`/`validateUpdate` returning `string[]`. Each feature adds its own validators (e.g. `validation` for launches/bookings) reusing this composition pattern.
- **Error handling** (`utils/error-handler.ts`): centralized `sendNotFound`, `sendValidationErrors`; extend with `sendConflict` (409) for capacity/email conflicts and `sendBadRequest` as needed. Routers wrap async work in try/catch and emit structured errors.
- **Logging** (`utils/logger.ts`): `[TIMESTAMP] [LEVEL] [CONTEXT] message`, levels `debug<info<warn<error`, gated by `LOG_LEVEL` (default `info`). `requestLogger` logs every request and its completion.
- **Payment gateway** (`utils/payment-gateway.ts`, new): adapter exposing `charge(amount): PaymentResult` to decouple billing from a real provider (mock returns success).

### Data Flow

Booking a seat (representative cross-entity flow):

```text
Client POST /api/bookings { launchId, customerEmail, seats }
  → bookings.router validates body shape
  → bookings.service:
       1. resolve/create customer by email (customers.repository)
       2. load launch (launches.repository) → 404 if missing
       3. compute remaining seats from bookings.repository → 409 if insufficient
       4. compute totalPrice = seats * launch.pricePerSeat
       5. payment-gateway.charge(totalPrice) → paymentStatus
       6. bookings.repository.create(...)
  → router logs + responds 201 with booking
```

### Target Folder Structure

```text
.                              # Monorepo root
├── CLAUDE.md                  # AI agent instructions
├── README.md                  # Human docs
├── IA/
│   ├── PRD.md                 # Product requirements
│   └── ADD.md                 # This document
├── package.json               # Root: Playwright
├── playwright.config.ts
├── tests/
│   ├── smoke.spec.ts
│   ├── rockets.spec.ts
│   ├── launches.spec.ts
│   ├── customers.spec.ts      # (new)
│   └── bookings.spec.ts       # (new)
├── backend/
│   └── src/
│       ├── main.ts            # Entry point, middleware wiring
│       ├── routes/index.ts    # Root router (/api) + health
│       ├── types/
│       │   ├── rockets.type.ts
│       │   ├── launches.type.ts
│       │   ├── customers.type.ts   # (new)
│       │   └── bookings.type.ts    # (new)
│       ├── middleware/request-logger.ts
│       ├── utils/
│       │   ├── validation.ts
│       │   ├── error-handler.ts
│       │   ├── logger.ts
│       │   └── payment-gateway.ts  # (new) mock billing adapter
│       ├── rockets/
│       │   ├── rockets.repository.ts
│       │   └── rockets.router.ts
│       ├── launches/
│       │   ├── launches.repository.ts
│       │   ├── launches.service.ts
│       │   ├── launches.validation.ts
│       │   └── launches.router.ts
│       ├── customers/              # (new)
│       │   ├── customers.repository.ts
│       │   └── customers.router.ts
│       └── bookings/               # (new)
│           ├── bookings.repository.ts
│           ├── bookings.service.ts
│           └── bookings.router.ts
└── frontend/                  # Vue 3 + Vite SPA
    └── src/
        ├── main.ts
        ├── App.vue
        └── components/
```

API surface (target):

| Method | Path | Purpose | Status |
|--------|------|---------|--------|
| GET | `/api/health` | Health check | Implemented |
| GET/POST | `/api/rockets` | List/create rockets | Implemented |
| GET/PUT/DELETE | `/api/rockets/:id` | Read/update/delete rocket | Implemented |
| GET/POST | `/api/launches` | List/create launches | Implemented |
| GET/PUT/DELETE | `/api/launches/:id` | Read/update/delete launch | Implemented |
| GET/POST | `/api/customers` | List/create customers | Implemented |
| GET | `/api/customers/:id` | Read customer | Implemented |
| GET/POST | `/api/bookings` | List/create bookings (`?launchId=` filter) | Implemented |
| GET | `/api/bookings/:id` | Read booking | Implemented |

## Architecture Decisions Record (ADR)

### ADR 1: Functional layered architecture (router/service/repository)
- **Decision**: Organize each feature as functional modules — router (controller), optional service for cross-entity rules, and repository — instead of OOP/class-based controllers and services.
- **Status**: Accepted
- **Context**: Existing `rockets` feature already uses module-level functions; project rules favor composition over inheritance, small functions, and minimal dependencies.
- **Consequences**: Consistent, low-ceremony, easily testable code. Shared state lives in module-scoped `Map`s, so modules are effectively singletons — acceptable for an in-memory demo but not horizontally scalable.

### ADR 2: In-memory `Map` persistence
- **Decision**: Store every entity in a per-feature in-memory `Map<string, Entity>`; no external database.
- **Status**: Accepted
- **Context**: PRD scopes out persistent storage; goal is to demonstrate clean architecture, not durability.
- **Consequences**: Zero setup, fast tests, simple repositories. Data is lost on restart and cannot be shared across processes; repository interface is kept narrow so a future DB adapter could replace it without touching routers/services.

### ADR 3: Derived seat availability
- **Decision**: Compute remaining seats from `launch.seatsOffered` minus the sum of booking seats, rather than persisting a mutable counter.
- **Status**: Accepted
- **Context**: Avoids dual-write inconsistency between bookings and a counter.
- **Consequences**: Always consistent; O(n) over a launch's bookings per check — negligible at demo scale. Single-process model avoids concurrency races.

### ADR 4: Mock payment gateway via adapter
- **Decision**: Encapsulate billing behind a `payment-gateway` adapter exposing `charge(amount)`; the implementation is a deterministic mock.
- **Status**: Accepted
- **Context**: PRD requires billing on booking but excludes real payment integration; project rules recommend the adapter pattern to decouple external systems.
- **Consequences**: Booking logic is provider-agnostic; swapping in a real gateway later requires changing only the adapter.

### ADR 5: Customer identity by email
- **Decision**: Treat `email` as the natural unique key for customers; resolve-or-create on booking.
- **Status**: Accepted
- **Context**: PRD identifies customers by email and excludes auth/accounts.
- **Consequences**: Simple onboarding during booking; requires a uniqueness check returning 409 on duplicate explicit creation. No authentication means email is unverified.

### ADR 6: Centralized validation, error handling, and logging
- **Decision**: Reuse the shared `validation` (composed field validators), `error-handler` (typed senders), and `logger` (level-gated, formatted) utilities across all features.
- **Status**: Accepted
- **Context**: Consistency, DRY, and the established rockets implementation.
- **Consequences**: Uniform error/response/log shapes; new features extend shared utilities instead of reinventing them.

### ADR 7: Vitest for backend unit testing
- **Decision**: Use Vitest for fast, isolated backend unit tests, colocated with the source as `backend/src/**/*.test.ts`; keep Playwright for HTTP/API end-to-end coverage at the repo root.
- **Status**: Accepted
- **Context**: The backend had no unit tests — only Playwright suites that require a live server, making pure-logic checks slow to run. Vitest is ESM-native, runs TypeScript via esbuild with no extra config under the existing `tsx`/NodeNext setup, and offers a Jest-compatible API.
- **Consequences**: Repositories, validators, utils, and services gain quick feedback via `npm run test:dev` (watch) / `npm run test` (CI) from `backend/`. Two layers of testing must be maintained, but each covers a distinct concern (unit logic vs. end-to-end behavior). NodeNext `.js` import extensions remain valid in test files.
