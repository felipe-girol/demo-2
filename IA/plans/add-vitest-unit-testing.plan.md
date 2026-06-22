# Plan: Add Vitest Unit Testing

## Context

The backend currently has no unit testing — only Playwright E2E/smoke tests
(run from the root against a live server). The user wants fast, isolated unit
tests for backend logic (repositories, validators, utils) runnable in watch
mode via `npm run test:dev`, plus documentation and a reusable agent skill so
future coding sessions write tests consistently.

**Decisions (confirmed with user):**
- Framework: **Vitest** (ESM-native, zero-config TS via the existing `tsx`/NodeNext setup, Jest-compatible API).
- Location: **backend package** — tests colocated next to source as `src/**/*.test.ts`. Root stays reserved for Playwright.

## Changes

### 1. Install & configure Vitest (backend)
- `cd backend && npm install -D vitest` (adds to `backend/package.json` devDependencies).
- Edit `backend/package.json` scripts (currently `dev`, `build`, `start`) to add:
  - `"test:dev": "vitest"` (watch mode)
  - `"test": "vitest run"` (single run, CI-friendly)
- Add `backend/vitest.config.ts`:
  - `test.environment: "node"`, `test.include: ["src/**/*.test.ts"]`, `test.globals: false` (use explicit imports to match the named-export style).
- No `tsconfig` change needed; Vitest uses esbuild for TS. NodeNext `.js` import extensions in source remain valid.

### 2. Seed example unit tests (prove the setup, follow existing style)
Write 2 small tests next to the source they cover, using `import { describe, it, expect } from "vitest"` and `.js` import extensions:
- `backend/src/rockets/rockets.repository.test.ts` — covers `create`/`findById`/`update`/`remove` from `rockets.repository.ts` (in-memory Map CRUD).
- `backend/src/utils/validation.test.ts` — covers `validateCreate`/`validateUpdate` from `validation.ts` (valid input → no errors; bad `range`/`capacity` → expected messages).

### 3. Update documentation
- **CLAUDE.md** (Tech Stack + Development workflow): change `Testing: **Playwright**` to note Playwright (E2E) **and Vitest (unit)**; add `cd backend && npm run test:dev` (watch) / `npm run test` (run) to the workflow block. Optionally note unit tests live in `src/**/*.test.ts`.
- **IA/ADD.md**: update **Testing** bullet (line 29) to add Vitest for backend unit tests; add Vitest unit-test commands to the Workflow block (lines 42–59); optionally add a short ADR (e.g. "ADR 7: Vitest for unit testing") with decision/context/consequences.
- **IA/PRD.md**: update **TR5** title/description to cover both Playwright and Vitest, or add **TR6 Unit testing** (Vitest, backend logic, Priority Medium, Status InProgress) following the existing TR template.

### 4. Write the `unit-test` agent skill
Create `.claude/skills/unit-test/SKILL.md` matching the repo's skill format
(YAML frontmatter `name`/`description`, then `# Title`, `## Role`, `## Task`,
`## Context`, `## Steps to follow` checklist, `## Output Checklist`). Content:
- Framework = Vitest; run with `npm run test:dev` (watch) / `npm run test` (CI), from `backend/`.
- Conventions: colocate as `src/**/*.test.ts`; explicit `import { describe, it, expect } from "vitest"`; `.js` extensions in imports; no `any`; AAA (Arrange-Act-Assert); test behavior not implementation; reuse named exports.
- Guidance on what to unit-test (repositories, validators, utils, services) vs. what stays in Playwright (HTTP/API end-to-end).
- Reference `.claude/rules/ts.md` clean-code conventions.

## Critical files
- `backend/package.json` (scripts + devDeps)
- `backend/vitest.config.ts` (new)
- `backend/src/rockets/rockets.repository.test.ts` (new), `backend/src/utils/validation.test.ts` (new)
- `CLAUDE.md`, `IA/ADD.md`, `IA/PRD.md`
- `.claude/skills/unit-test/SKILL.md` (new)

## Verification
1. `cd backend && npm install` then `npm run test` → both example test files pass.
2. `npm run test:dev` → watch mode starts; editing a test re-runs it.
3. Confirm root `npm test` (Playwright) is unaffected.
4. Re-read CLAUDE.md / IA/ADD.md / IA/PRD.md to confirm Vitest is documented consistently.
5. Confirm `.claude/skills/unit-test/SKILL.md` is well-formed and appears in the skills list.
