# Agents Instructions

## Product Overview
- AstroBookings is a backend API for rocket launch bookings.
- Manages rockets, launches, customers, and seat reservations.
- Customers book seats on launches and are billed via a mock gateway.
- Includes a Vue frontend and Playwright smoke tests.
- See `IA/PRD.md` for requirements and `IA/ADD.md` for architecture.

## Technical Implementation

### Tech Stack
- Language: **TypeScript ~6.0**
- Backend: **Express 5 on Node >= 20**
- Frontend: **Vue 3.5 with Vite 6**
- Database: **In-memory Map (no external DB)**
- Security: **CORS enabled** (no auth in scope)
- Testing: **Playwright** (E2E/smoke) and **Vitest** (backend unit)
- Logging: **console (stdout)**

### Development workflow
```bash
# Install dependencies
cd backend && npm install
cd frontend && npm install
npm install # root for Playwright

# Run backend (dev mode with hot reload)
cd backend && npm run dev

# Run frontend (dev mode)
cd frontend && npm run dev

# Build backend
cd backend && npm run build

# Build frontend
cd frontend && npm run build

# Run smoke tests (backend must be running)
npm test

# Run only smoke tests
npm run test:smoke

# Run backend unit tests (Vitest)
cd backend && npm run test       # single run (CI-friendly)
cd backend && npm run test:dev   # watch mode
```

> Unit tests live in `backend/src/**/*.test.ts`, colocated next to the code they cover.

### Architecture
- Functional layered modules; no classes. Favor composition.
- Per feature: `*.router.ts` (HTTP), optional `*.service.ts` (domain), `*.repository.ts` (Map).
- Use a service only for cross-entity rules (launches, bookings).
- Simple CRUD (rockets, customers) may call the repository directly.
- Types and DTOs live in `types/*.type.ts`.
- Repositories own a private `Map<string, Entity>` with CRUD functions.
- Reuse shared `validation`, `error-handler`, `logger` utilities.
- Bill bookings through the `utils/payment-gateway.ts` mock adapter.
- Seat availability is derived (seatsOffered minus booked seats).

### Folder structure
```text
.                              # Project root (monorepo)
├── CLAUDE.md                  # Instructions for AI agents
├── README.md                  # Human documentation
├── IA/                        # PRD.md and ADD.md
├── package.json               # Root: Playwright tests
├── playwright.config.ts       # Playwright configuration
├── tests/                     # Playwright test files (one per feature)
├── backend/                   # Express API
│   └── src/
│       ├── main.ts            # Entry point (port 3000)
│       ├── routes/index.ts    # Root router (/api) + health
│       ├── types/             # *.type.ts (entities + DTOs)
│       ├── middleware/        # request-logger.ts
│       ├── utils/             # validation, error-handler, logger, payment-gateway
│       ├── rockets/           # repository + router
│       ├── launches/          # repository + service + validation + router
│       ├── customers/         # repository + router
│       └── bookings/          # repository + service + validation + router
└── frontend/                  # Vue 3 + Vite app
    └── src/                   # main.ts, App.vue, components/
```

### API Endpoints
- `GET /api/health` - Health check
- `GET|POST /api/rockets`, `GET|PUT|DELETE /api/rockets/:id`
- `GET|POST /api/launches`, `GET|PUT|DELETE /api/launches/:id`
- `GET|POST /api/customers`, `GET /api/customers/:id`
- `GET|POST /api/bookings`, `GET /api/bookings/:id` (implemented; billing via FR8 pending)

### Logging
- Format: `[TIMESTAMP] [LEVEL] [CONTEXT] message`
- Levels: `debug` < `info` < `warn` < `error`
- Control via `LOG_LEVEL` env var (default: `info`)
- HTTP requests, CRUD operations and errors are logged automatically

### Validation Rules
- Rocket `name`: required, non-empty string.
- Rocket `range`: one of `suborbital`, `orbital`, `moon`, `mars`.
- Rocket `capacity`: integer between 1 and 10.
- Launch: `rocketId` exists, `seatsOffered` <= rocket capacity.
- Launch: `minPassengers` <= `seatsOffered`, future `date`, positive `pricePerSeat`.
- Customer: unique non-empty `email` (natural key), with name and phone.
- Booking: `seats` <= remaining available seats on the launch.

## Environment
- Code and documentation must be in English.
- Chat responses must be in the language of the user prompt.
- Sacrifice grammar for conciseness in responses.
- This is a windows environment using git bash terminal.
- My default branch is `main`.
- Follow `.claude/rules/ts.md` clean-code conventions.
- Mind the available agent skills when performing tasks.
