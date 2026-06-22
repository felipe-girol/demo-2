# Customers Management Specification

- **Reference**: [PRD](../PRD.md) FR6.
- **Issue**: _to be created_
- **Status**: Released

## Problem Description

The platform needs to register and manage customers so they can later book seats on launches. Each customer is uniquely identified by their email address (natural key) and provides a name and phone number. Without customer management, the system cannot associate bookings with a person or prevent duplicate registrations.

### User Stories

- As an **agency owner**, I want to **register customers with their contact details** so that I can associate bookings with a verified person.
- As an **agency owner**, I want to **prevent duplicate customer registrations** so that each customer is uniquely identified by email.
- As a **customer**, I want to **be registered with my email, name, and phone** so that I can book seats on launches.

## Solution Overview

### User/App interface

RESTful endpoints under `/api/customers`:
- `GET /api/customers` - List all registered customers.
- `GET /api/customers/:id` - Get a customer by identifier.
- `POST /api/customers` - Register a new customer.

### Model and logic

A customer contains:
- `id`: unique identifier (UUID).
- `email`: unique contact email, natural key (non-empty string).
- `name`: customer full name (non-empty string).
- `phone`: customer phone number (non-empty string).

Validation rules:
- `email` must be a non-empty string.
- `email` must be unique across all registered customers.
- `name` must be a non-empty string.
- `phone` must be a non-empty string.

### Persistence

In-memory Map storage, consistent with the existing rockets repository pattern.

## Acceptance Criteria

- [x] WHEN a client sends a valid POST request with email, name, and phone, THE API SHALL register a new customer and return it with a unique identifier and status 201.
- [x] IF a client sends a POST request with an email that already exists, THEN THE API SHALL reject the request with a 409 conflict error.
- [x] IF a client sends a POST request with a missing or empty email, THEN THE API SHALL reject the request with a 400 validation error.
- [x] IF a client sends a POST request with a missing or empty name, THEN THE API SHALL reject the request with a 400 validation error.
- [x] IF a client sends a POST request with a missing or empty phone, THEN THE API SHALL reject the request with a 400 validation error.
- [x] WHEN a client sends a GET request to the customers endpoint, THE API SHALL return a list of all registered customers.
- [x] WHEN a client sends a GET request with an existing customer identifier, THE API SHALL return the details of that customer.
- [x] IF a client sends a GET request with a non-existent customer identifier, THEN THE API SHALL respond with a 404 not-found error.
- [x] WHEN a customer is registered or retrieved, THE API SHALL log the operation using the structured logger.
