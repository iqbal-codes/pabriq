---
name: pabriq-test-safety
description: Testing and test safety for pabriq-app-v2 — adding or modifying unit, database integration, React component, route-navigation, or E2E tests; choosing which test type covers a change; running targeted test subsets; ensuring staging database safety through project scripts only. Use whenever writing tests, changing test infrastructure, or debugging test failures in this repository.
---

# Test Safety and Taxonomy

All tests in this repository run against a **staging Postgres database** loaded via Infisical. The safety boundary is absolute: **every test command must go through project Bun scripts**; never invoke `vitest`, `playwright test`, `jest`, `bun test`, `npx vitest`, or `bunx playwright` directly.

## 1. Identify the test type

Choose the narrowest tier that covers the observable contract:

| Tier | What it tests | Environment | Key marker | Canonical examples |
|------|--------------|-------------|------------|-------------------|
| **Pure unit** | Single function, no DB, no network, no DOM | happy-dom (vitest) | Imports only the module under test; no `vi.mock` of DB | `src/features/pricing/engine.test.ts`, `src/features/permissions/model.test.ts`, `src/lib/date-utils.test.ts` |
| **DB integration** | Real Postgres via Drizzle, TRUNCATE in `beforeEach` | happy-dom (vitest) + staging DB | Imports `db` from `#/db/index`; uses `sql`TRUNCATE … CASCADE`` | `src/features/orders/model.test.ts`, `src/features/production/model.test.ts`, `src/features/invoices/model.test.ts` |
| **React component** | Rendered output, user interaction, accessibility | happy-dom (vitest) | `@testing-library/react` render; `vi.mock` at module level | `src/components/app-sidebar.test.tsx`, `src/components/app/data-table/data-table.test.tsx` |
| **Route navigation** | `beforeLoad` guards, redirects, route tree wiring | happy-dom (vitest) | `createRouter` + `createMemoryHistory`; mock session functions | `src/routes/-route-guards.test.tsx`, `src/routes/_org/settings/-production-stages.test.tsx` |
| **E2E** | Full browser flow against running dev server | Playwright (chromium) | Files in `e2e/**/*.spec.ts`; helpers from `e2e/helpers/auth.ts` | `e2e/auth.spec.ts`, `e2e/onboarding.spec.ts` |

**Decision rule**: If the contract is a pure function output → pure unit. If it requires Postgres round-trips → DB integration. If it renders React and asserts DOM → React component. If it tests route `beforeLoad` logic or redirect behavior → route navigation. If it requires a running app and a browser → E2E.

**Completion criterion**: The chosen tier matches every observable contract in the change; no tier is skipped when its contracts are exercised.

## 2. Safe command syntax

### Unit, integration, and component tests (vitest)

| Action | Command |
|--------|---------|
| Run one file | `bun run test -- src/features/pricing/engine.test.ts` |
| Run by name pattern | `bun run test -- -t "calculateUnitPrice"` |

**How it works** (Observed): `package.json` defines `"test": "VITEST_FROM_SCRIPT=true bun run load-env-test -- -- vitest run --passWithNoTests"`. The `load-env-test` wrapper resolves the Infisical staging access token and injects `DATABASE_URL`. The `VITEST_FROM_SCRIPT=true` flag passes the safety gate in `vitest.config.ts` (line 6: `if (!process.env.VITEST_FROM_SCRIPT) { process.exit(1) }`). Without it, vitest aborts immediately. The script already includes `vitest run`, so `--` passes additional vitest flags (file path, `-t` pattern) directly — do not add `--run`.

**Completion criterion**: Every vitest invocation uses `bun run test -- <target>` as the entry point; no redundant `--run` flag is added.

### E2E tests (Playwright)

| Action | Command |
|--------|---------|
| Run all | `bun run test:e2e` |
| Run headed | `bun run test:e2e:headed` |
| Debug mode | `bun run test:e2e:debug` |
| Run one file | `bun run test:e2e -- e2e/auth.spec.ts` |
| Run by grep | `bun run test:e2e -- -g "sign in"` |

**How it works** (Observed): `package.json` defines `"test:e2e": "bun run load-env-test -- -- playwright test"`. The `load-env-test` wrapper injects staging env vars. Playwright config (`playwright.config.ts`) starts `bun run dev` as the webServer on port 3001 with a 120s timeout. The setup project runs `e2e/global-setup.ts` to seed a test account; the `chromium` project depends on it.

**Completion criterion**: Every Playwright invocation uses `bun run test:e2e` as the entry point; E2E tests are in `e2e/` and use helpers from `e2e/helpers/auth.ts`.

## 3. Database danger and staging safety

This repository tests against a **shared staging Postgres instance**. Every DB integration test uses `TRUNCATE … CASCADE` to reset state. Misuse can destroy staging data.

**Required guardrails** (Observed):

- **Never run `TRUNCATE` outside a test `beforeEach`.** Every integration test file truncates in `beforeEach` and re-seeds required data inline. There is no shared seed helper across files — each file owns its own fixtures. Canonical pattern in `src/features/orders/model.test.ts:32-51`: `await db.execute(sql`TRUNCATE organization, biteship_areas CASCADE`)` followed by `db.insert(…)` for test data.
- **Scope TRUNCATE narrowly.** Truncate only the tables your test touches. Including unrelated tables wastes time and risks cascading deletes. The canonical pattern names explicit tables: `TRUNCATE organization, biteship_areas CASCADE` (not `TRUNCATE TABLE * CASCADE`).
- **Never `TRUNCATE` in E2E tests.** E2E tests share staging state via the seeded account from `e2e/global-setup.ts`. Do not add TRUNCATE operations to E2E helpers.
- **Never run `db:migrate` or `db:push` during test runs.** Schema changes are a pre-condition, not a test step.

**Positive direction**: When writing a new DB integration test, follow the file-local fixture pattern:
1. Import `db` from `#/db/index` and required tables from `#/db/schema`.
2. In `beforeEach`, `TRUNCATE` only the tables your test data requires.
3. Insert test data with `db.insert(…)` using deterministic IDs and timestamps.
4. Assert against the model functions, not raw SQL.
5. Never depend on data created by another test file.

**Completion criterion**: Every DB integration test file truncates only its required tables in `beforeEach`, seeds its own fixtures, and passes `bun run test -- <file>` without errors.

## 4. Observable-contract testing

Write tests that defend observable behavior, not internal plumbing.

**Required pattern**: Assert on return values, DOM output, HTTP status codes, or side effects the caller can observe. Never assert on implementation details like internal variable state, call counts of private helpers, or exact DOM tree structure.

| Tier | What to assert | What to avoid |
|------|---------------|---------------|
| Pure unit | Return values, error types, edge cases on inputs | Module-internal state, private helper calls |
| DB integration | Model function returns, row counts after mutation, computed fields | Exact SQL generated, connection pool internals |
| React component | Visible text, element presence/absence, role-based queries | Component internal state, hook call counts |
| Route navigation | Final URL, visible page content after redirect, URL search params | Router internals, `beforeLoad` implementation |
| E2E | Page URL, visible text, form submission results, network responses | API response bodies (test at the unit/integration level) |

**Observed convention** (from `src/features/pricing/engine.test.ts`): Pure unit tests call a function and `expect(result).toEqual(…)` on the full return structure — no mocking, no setup, just input → output.

**Observed convention** (from `src/components/app-sidebar.test.tsx`): Component tests use `screen.getByText(…)` / `screen.queryByText(…)` to assert visibility, not `container.querySelector`. The `queryByText` variant asserts absence (`toBeNull()`).

**Observed convention** (from `src/routes/-route-guards.test.tsx`): Route tests assert `router.state.location.pathname` and `screen.findByText(…)` after `router.load()` + `renderRouter(router)` — testing the guard's effect on navigation, not the guard function itself.

**Completion criterion**: Every assertion targets an observable contract; no test asserts on internal implementation details that would break under a correct refactor.

## 5. Mocking and fixture patterns

### Pure unit tests

No mocking needed. Import the module and call functions directly. If the module under test calls `fetch`, use `vi.spyOn(globalThis, 'fetch')` to intercept (Observed: `src/features/address/model.test.ts`).

### DB integration tests

No mocking of the database. Use real Postgres via `#/db/index`. Seed data inline with `db.insert(…)` using deterministic IDs (Observed: `org1Id = '00000000-0000-0000-0000-000000000001'`). If the module under test calls an external API (e.g., Midtrans), mock that boundary with `vi.mock` at the module level (Observed: `src/features/invoices/model.test.ts`).

### React component tests

Mock at the module boundary, not inside the component. Use `vi.mock(…)` at file top-level for router, query client, or other dependency boundaries. Use `vi.hoisted(…)` when the mock needs a reference the test can configure (Observed: `vi.hoisted(() => ({ mockFn: vi.fn() }))`). Wrap in provider components with `IntlProvider` for i18n (Observed: `app-sidebar.test.tsx` `TestWrapper`).

### Route navigation tests

Mock session functions at file scope with `vi.fn()` and configure per-test with `mockResolvedValue(…)`. Build route trees with `createRouter` + `createMemoryHistory({ initialEntries: [path] })`. Call `router.load()` then render (Observed: `-route-guards.test.tsx` `buildProtectedRouter`).

### E2E tests

No mocking. Use helpers from `e2e/helpers/auth.ts`: `gotoApp`, `signIn`, `signUp`, `completeOnboarding`, `waitForAuthenticated`. These handle locale cookies, React hydration waits, and form submission. Tests run against the real dev server on `localhost:3001`.

**Completion criterion**: Every mock is at a boundary; no mock replaces something the test should exercise; fixture data is deterministic and self-contained per test file.

## 6. File and naming conventions

- **Unit/integration/component tests**: Co-located with source as `<name>.test.ts` or `<name>.test.tsx` in the same directory. Route navigation tests use the hyphen-prefixed pattern: `src/routes/-<name>.test.tsx`.
- **E2E tests**: In `e2e/` directory as `<name>.spec.ts`.
- **Test setup**: `src/test/setup.ts` (loaded by vitest via `setupFiles`). Handles `dotenv` for `.env.test`, `@testing-library/jest-dom/vitest` matchers, `DATABASE_URL` guard, and `matchMedia` polyfill.
- **E2E setup**: `e2e/global-setup.ts` (Playwright `setup` project). Seeds the test account.
- **E2E helpers**: `e2e/helpers/auth.ts`. Shared navigation and form-fill utilities.
- **Test runner**: Vitest with `happy-dom` environment, `fileParallelism: false` (serial execution), `globals: true` (no need to import `describe`/`it`/`expect` explicitly, though the codebase convention is to import them).

**Completion criterion**: New test files follow the co-location and naming conventions; E2E specs go in `e2e/`; no test file is placed outside these locations.

## 7. Verification commands

Run targeted tests first. Full suite only if explicitly required for final handoff.

```bash
bun run test -- <changed-test-file>          # targeted vitest (first)
bun run test:e2e -- <changed-spec>           # targeted E2E (if applicable)
bun run typecheck                            # types must pass
bun run check                                # biome lint must pass
# Full suite — only for final handoff or pre-commit:
bun run test
```

**Completion criterion**: All commands exit 0; no flaky or skipped tests in the targeted file; type errors are absent.

## 8. Test infrastructure limitations

These are observed gaps, not blockers — awareness prevents surprises:

- **CI does not run tests** (Observed: `.github/workflows/ci.yml` runs lint, typecheck, build only). Tests are a local gate only.
- **Serial execution** (Observed: `vitest.config.ts` `fileParallelism: false`). Tests run one file at a time; slow DB integration tests gate the full suite.
- **No shared seed helpers** (Observed). Each DB integration test file duplicates its own TRUNCATE + insert pattern. This is intentional file-local isolation, not a gap to fix.
- **E2E uses dev server** (Observed: `playwright.config.ts` `webServer.command: 'bun run dev'`). Production-specific behavior (minification, SSR rendering, env loading) is not E2E-covered.

**Completion criterion**: The agent knows these limits and does not write tests that depend on CI execution, parallel test isolation, shared seed files, or production build behavior.

<!-- CODEBASE-SKILL-FORGE:HUMAN:START -->
<!-- Add intentional project policy here. Sync preserves this region byte-for-byte. -->
<!-- CODEBASE-SKILL-FORGE:HUMAN:END -->
