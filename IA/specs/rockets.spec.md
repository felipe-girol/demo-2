# Rocket Management API Specification

## Problem Description

- As an **agency owner**, I want to **register rockets with their specifications** so that I can offer space travel services to customers.
- As an **agency owner**, I want to **update and remove my rockets** so that I can keep my fleet information accurate and up to date.
- As a **customer**, I want to **view available rockets and their details** so that I can choose the right vehicle for my trip.

## Solution Overview

- Provide a RESTful API with standard CRUD endpoints for managing rockets.
- Each rocket is stored with a name, a range (one of: suborbital, orbital, moon, mars), and a capacity (integer from 1 to 10).
- Input validation ensures that range values and capacity limits are enforced at the API level.
- Rockets are persisted in the application database and associated with the agency that owns them.

## Acceptance Criteria

- [ ] When a client sends a valid POST request with name, range, and capacity, the system shall create a new rocket and return it with a unique identifier.
- [ ] When a client sends a POST request with a range value other than "suborbital", "orbital", "moon", or "mars", the system shall reject the request with a validation error.
- [ ] When a client sends a POST request with a capacity outside the 1-10 range, the system shall reject the request with a validation error.
- [ ] When a client sends a GET request to the rockets endpoint, the system shall return a list of all registered rockets.
- [ ] When a client sends a GET request with a specific rocket identifier, the system shall return the details of that rocket.
- [ ] When a client sends a GET request with a non-existent rocket identifier, the system shall respond with a not-found error.
- [ ] When a client sends a PUT request with valid updated data for an existing rocket, the system shall update the rocket and return the modified resource.
- [ ] When a client sends a DELETE request with an existing rocket identifier, the system shall remove the rocket and confirm the deletion.
- [ ] When a client sends a POST request missing required fields (name, range, or capacity), the system shall reject the request with a validation error.
