---
name: pabriq-app-v2-testing
description: How testing is done in the pabriq-app-v2 codebase. Vitest runs co-located unit/component/integration tests in happy-dom; Playwright runs E2E tests in `e2e/`. Tests live next to source (`*.test.tsx`, `*.test.ts`), use `@testing-library/react` for components, and hit a real staging DB for model integration tests. Use whenever the user writes, runs, or debugs tests in pabriq-app-v2, even if they don't say "testing".
---

# pabriq-app-v2 — Testing

This skill covers the test infrastructure for pabriq-app-v2: the runners, the config, where tests live, how they're structured, and the conventions to follow when adding new ones.

> Read `../pabriq-app-v2-foundation/references/codebase-profile.md` first for the stack, architecture, and tooling context. This skill adds the testing-specific details.

## Where things live

- **Vitest config**: `vitest.config.ts` (project root)
- **Playwright config**: `playwright.config.ts` (project root)
- **Test setup**: `src/test/setup.ts` — global Vitest setup (jest-dom matchers, DOM mocks, env safety checks)
- **Type declarations**: `src/test/globals.d.ts` — references `vitest/globals` for `describe`/`it`/`expect` without imports
- **Unit/component tests**: co-located with source as `*.test.tsx` or `*.test.ts` (e.g. `src/lib/sorting.test.ts`, `src/lib/date-utils.test.ts`)
- **Integration tests**: also co-located, but import the Drizzle `db` directly and run against the staging database (e.g. `src/features/products/model.test.ts`, `src/features/production/model.test.ts`)
- **E2E tests**: `e2e/*.spec.ts` (Playwright) with shared helpers in `e2e/helpers/`

## How we do testing here

### Safety guards prevent wrong-DB accidents

Both the Vitest config and the test setup enforce that tests only run through the proper script. Running `vitest` directly or without the Infisical env loader is blocked.

> from `vitest.config.ts`
```ts
if (!process.env.VITEST_FROM_SCRIPT) {
  console.error('\n❌ SAFETY ABORT: Running vitest directly is not allowed!')
  console.error('   Use `bun run test` to ensure correct database environment.\n')
  process.exit(1)
}
```

> from `src/test/setup.ts`
```ts
if (!DATABASE_URL) {
  console.error('\n❌ DATABASE_URL is not set!')
  console.error('   Use `bun run test` (which uses load-env-test) or create .env.test with DATABASE_URL.\n')
  process.exit(1)
}
```

Why: The staging DB is used for integration tests. These guards ensure tests never accidentally run against production.

### Pure unit tests — no DB, no mocks

Simple utility functions are tested with plain `describe`/`it`/`expect` from Vitest globals. No setup, no mocking.

> from `src/lib/date-utils.test.ts`
```ts
describe('addWorkingDays', () => {
  it('skips Sunday', () => {
    const saturday = new Date('2024-01-06')
    const result = addWorkingDays(saturday, 1)
    expect(result.getDay()).toBe(1) // Monday
    expect(result.getDate()).toBe(8)
  })
})
```

### Integration tests with real DB

Model tests (`model.test.ts`) import the Drizzle `db` directly and run against the staging database. `beforeEach` truncates tables with `TRUNCATE ... CASCADE` and seeds test organizations.

> from `src/features/products/model.test.ts`
```ts
beforeEach(async () => {
  await db.execute(sql`TRUNCATE organization, biteship_areas CASCADE`)
  const now = new Date()
  await db.insert(organization).values([
    { id: org1Id, name: 'Org 1', slug: 'org-1', createdAt: now, updatedAt: now },
    { id: org2Id, name: 'Org 2', slug: 'org-2', createdAt: now, updatedAt: now },
  ])
})
```

Why: These tests verify the full data layer — Drizzle queries, constraints, and org-scoped isolation — not just a mock of it.

### React hooks with mocked server functions

Hooks that call `createServerFn` endpoints are tested with `renderHook` from `@testing-library/react`. Server functions are mocked with `vi.mock`, and a `QueryClientProvider` wrapper is created per test.

> from `src/features/products/hooks.test.ts`
```ts
vi.mock('#/features/products/server', () => ({
  listProductsFn: (...args: unknown[]) => mockListProductsFn(...args),
  createProductFn: (...args: unknown[]) => mockCreateProductFn(...args),
}))

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children)
  }
}
```

### E2E tests with Playwright

Playwright tests live in `e2e/` and cover authentication, redirects, and onboarding flows. A `global-setup.ts` project creates the test account once before all tests. Shared helpers (`e2e/helpers/auth.ts`) provide `gotoApp`, `signIn`, `signUp`, and `completeOnboarding`.

> from `e2e/auth.spec.ts`
```ts
test('shows sign-in form with all fields', async ({ page }) => {
  await gotoApp(page, '/sign-in')
  await expect(
    page.locator('[data-slot="card-title"]').filter({ hasText: 'Sign in' }),
  ).toBeVisible()
  await expect(page.getByLabel('Email')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()
})
```

## Commands

- Run all Vitest tests: `bun run test`
- Run a single Vitest test file: `bun run test src/lib/sorting.test.ts`
- Run Vitest in watch mode: `bun run test -- --watch`
- Run all E2E tests: `bun run test:e2e`
- Run E2E headed: `bun run test:e2e:headed`
- Run E2E debug mode: `bun run test:e2e:debug`
- Typecheck: `bun run typecheck`

## Conventions observed

- **Co-location**: every test file sits next to the source it tests — `sorting.ts` has `sorting.test.ts`, `model.ts` has `model.test.ts`
- **Vitest globals**: `describe`, `it`, `expect`, `vi`, `beforeEach` are available globally without imports (configured via `globals: true` in vitest config and `src/test/globals.d.ts`). Imports are still used in some files for clarity.
- **Happy-dom**: the test environment is `happy-dom` (not jsdom), configured in `vitest.config.ts`
- **File parallelism disabled**: `fileParallelism: false` in vitest config — tests run sequentially to avoid DB conflicts
- **Test files follow source naming**: `*.test.ts` for logic, `*.test.tsx` for React components/hooks, `*.spec.ts` for Playwright E2E
- **E2E helpers**: shared page actions live in `e2e/helpers/`, not duplicated across spec files
- **DB cleanup**: integration tests use `TRUNCATE ... CASCADE` in `beforeEach` — no test isolation library, just direct SQL

## Anti-patterns to avoid

- **Never run `vitest` directly** — always use `bun run test` which sets `VITEST_FROM_SCRIPT=true` and loads env via Infisical
- **No `describe.skip` or `it.skip`** as a habit — if a test can't run, fix it or delete it; skip accumulates debt
- **Don't mock what you can test for real** — model tests use the actual database; hooks tests mock server functions but not the query layer
- **Don't place tests in a separate `__tests__/` directory** — this repo co-locates tests next to source
- **Don't add `jsdom`** — the project uses `happy-dom`; switching creates subtle DOM API differences

## Gaps / verify

- **No coverage configuration** — there is no `coverage` block in `vitest.config.ts` and no coverage threshold is enforced. Verify before adding coverage expectations.
- **No `@playwright/test` in devDependencies** — Playwright is available via the system install or `npx`, not declared in `package.json`. Verify the Playwright version matches expectations.
- **E2E tests depend on a running app** — the Playwright config starts `bun run dev` automatically via `webServer`, but the staging DB must be reachable. The `load-env-test` script handles this via Infisical.
- **Sparse component test coverage** — only a few components have `.test.tsx` files (e.g. `asset-image`, `asset-file`, `order-line-items-card`). Most components are untested. Verify what coverage exists before writing new tests.
