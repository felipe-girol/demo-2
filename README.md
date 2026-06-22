# AstroBookings 

A **backend API** for offering bookings for rocket launches.

- **Rockets API**: Full CRUD for managing rockets with name, range, and capacity validation.
- Rockets have limited seats; launch requests are validated against rocket capacity.

- Launches are scheduled for specific rockets, with pricing and minimum passenger thresholds.

- Launch status lifecycle: scheduled → confirmed → successful, or cancellation/suspension paths.

- A customer is identified by their email address and has a name and phone number.

- One customer can book multiple seats on a launch but cannot exceed the available seats.

- Customers are billed upon booking, and payments are processed through a mock gateway.


## Logging

The backend uses a structured logging utility built on `console.*` with no external dependencies.

- Log format: `[TIMESTAMP] [LEVEL] [CONTEXT] message`
- Log levels (ascending priority): `debug`, `info`, `warn`, `error`
- All incoming HTTP requests and their response status/duration are logged automatically via middleware.
- CRUD operations on rockets produce `info`-level logs.
- All error responses are logged at the `error` level.

### Configuration

Set the `LOG_LEVEL` environment variable to control the minimum log level emitted (default: `info`):

```bash
LOG_LEVEL=debug node dist/main.js   # verbose — includes debug output
LOG_LEVEL=info  node dist/main.js   # default
LOG_LEVEL=warn  node dist/main.js   # warnings and errors only
LOG_LEVEL=error node dist/main.js   # errors only
```

---

- [Repository at GitHub](https://github.com/felipe-girol/curso-ia-astro-bookings)
- Default branch: `main`

- **Author**: Felipe Girol Jiménez