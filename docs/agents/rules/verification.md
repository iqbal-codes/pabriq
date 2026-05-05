# Verification Rules

> **Reference:** [`../boilerplate/testing.md`](../boilerplate/testing.md) — test patterns with code examples, file placement.

## Purpose

Defines the mandatory pre-commit and pre-PR verification steps, testing conventions, and quality gates.

## When To Read This

- Before committing any code.
- Before marking a feature slice or task as complete.
- When writing or running tests.
- When a CI pipeline fails and you need to reproduce locally.

## Current Project Pattern

**Verification commands** (from `package.json`):

| Command | What it does |
|---|---|
| `bun run check` | Biome: format + lint check |
| `bun run typecheck` | `tsc --noEmit` |
| `bun run test` | `vitest run --passWithNoTests` |
| `bun run build` | `vite build` + copy `instrument.server.mjs` |

**Test config:** `vitest.config.ts` — `happy-dom` environment, globals enabled, setup from `src/test/setup.ts`, includes `src/**/*.{test,spec}.{ts,tsx}`.

**Test setup:** `src/test/setup.ts` — imports `@testing-library/jest-dom/vitest` for DOM matchers and `@testing-library/react`.

**Supported test patterns:**

- **Deep module unit tests:** Test pure functions without React — `src/features/pricing/engine.test.ts`, `src/features/permissions/model.test.ts`.
- **Model integration tests:** Test server functions against the database — `src/features/products/model.test.ts`, `src/features/customers/model.test.ts`.
- **Route guard tests:** Test `beforeLoad` with mock contexts — `src/routes/-route-guards.test.tsx`, `src/routes/_org/customers/-customer-routes.test.tsx`.
- **Component tests:** Test UI components with `@testing-library/react` — `src/components/confirm-dialog.test.tsx`, `src/components/status-badge.test.tsx`, `src/components/app/page-shell/breadcrumbs.test.tsx`, `src/components/app/page-shell/page-header.test.tsx`, `src/components/app/page-shell/page-content.test.tsx`, `src/components/app/page-shell/empty-state.test.tsx`, `src/components/app/form/form.test.tsx`, `src/components/app/data-table/data-table.test.tsx`.

## Non-Negotiable Rules

- MUST run `bun run check`, `bun run typecheck`, and `bun run test` before committing. All three MUST pass.
- MUST run `bun run build` for any change that touches server functions, routes, or imports — build catches errors `tsc` may miss.
- MUST use Vitest and `@testing-library/react` for tests — MUST NOT introduce a separate test framework.
- MUST wrap components that use `useTranslations` in `IntlProvider` with test messages.
- MUST place test files next to the file they test with `.test.ts` or `.test.tsx` extension (co-location pattern).
- MUST NOT use snapshot tests for full pages — prefer focused, user-visible behavior assertions.

## Allowed Exceptions

- `--passWithNoTests` flag in `bun run test` allows feature branches with no tests yet — but new features MUST add tests before being considered complete.

## Implementation Checklist

1. Write tests as soon as a feature is implemented, not after.
2. Place test files co-located with the implementation (`src/routes/_org/customers/-customer-routes.test.tsx` tests `src/routes/_org/customers/`).
3. For i18n-dependent components, create a minimal `testMessages` object with only the keys needed.
4. Use `vitest` globals (`describe`, `it`, `expect`, `beforeEach`) — they are enabled in `vitest.config.ts`.
5. Run `bun run check && bun run typecheck && bun run test` before pushing.

## Verification

Full pre-commit pipeline:

```
bun run check
bun run typecheck
bun run test
bun run build
```

All four commands must exit with success.

## Common Mistakes To Avoid

- Running only `bun run check` and skipping `bun run typecheck` — they catch different classes of errors.
- Forgetting `bun run build` when changing route files — build detects server function wiring issues that `tsc` may not.
- Using `jest` imports instead of `vitest` — the project uses `vitest` with globals.
- Forgetting `IntlProvider` wrapper in tests — components using `useTranslations` will crash without it.
- Creating snapshot tests that capture UI chrome instead of testing specific user-visible behavior.
- Leaving placeholder tests (`it('works')`) without real assertions — `passWithNoTests` handles empty suites but not empty tests.
