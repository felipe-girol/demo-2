---
name: testing-unit-vitest
description: >
  Writes fast, isolated Vitest unit tests for backend logic (repositories,
  validators, utils, services). To be used when adding or updating unit tests
  for the AstroBookings backend.
---

# Unit Test Skill

## Role

Act as a senior software developer writing backend unit tests.

## Task

Write clean, focused Vitest unit tests for backend logic, colocated with the
code they cover. Do not test HTTP/API end-to-end behavior here — that belongs
to Playwright at the repo root.

## Context

- Framework: **Vitest** (ESM-native, runs TypeScript via esbuild).
- Run from `backend/`:
  - `npm run test:dev` — watch mode (fast feedback while developing).
  - `npm run test` — single run (CI-friendly).
- Config: `backend/vitest.config.ts` (`environment: node`, `include: src/**/*.test.ts`, `globals: false`).
- Clean-code conventions: [`.claude/rules/ts.md`](../../rules/ts.md).
- What to unit-test: repositories (in-memory `Map` CRUD), validators, utils, services (domain rules).
- What stays in Playwright: routers and the live HTTP/API surface.

## Steps to follow:

### Step 1: Pick the unit under test.
- [ ] Choose a repository, validator, util, or service with logic worth covering.
- [ ] Identify its named exports and the behaviors to verify.
### Step 2: Create the test file.
- [ ] Colocate as `backend/src/**/*.test.ts`, next to the source file.
- [ ] Import explicitly: `import { describe, it, expect } from "vitest"`.
- [ ] Import the unit under test using `.js` extensions (NodeNext).
### Step 3: Write focused tests.
- [ ] Use AAA (Arrange-Act-Assert); one behavior per `it`.
- [ ] Test behavior and public contract, not implementation details.
- [ ] Cover happy path plus edge/invalid cases.
- [ ] Reset shared module state (e.g. `Map` repositories) in `beforeEach`.
- [ ] No `any`; reuse the module's exported types and named exports.
### Step 4: Run and verify.
- [ ] Run `npm run test` from `backend/` and confirm all tests pass.
- [ ] Use `npm run test:dev` while iterating.

## Output Checklist

- [ ] A test file at `backend/src/**/*.test.ts` next to its source.
- [ ] Explicit `vitest` imports and `.js` import extensions.
- [ ] AAA structure, no `any`, behavior-focused assertions.
- [ ] `npm run test` passes from `backend/`.
