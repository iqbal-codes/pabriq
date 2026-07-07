---
name: pabriq-app-v2-testing
description: How testing is done in the pabriq-app-v2 codebase. Vitest runs co-located unit/component/integration tests in happy-dom; Playwright runs E2E tests in `e2e/`. Tests live next to source (`*.test.tsx`, `*.test.ts`), use `@testing-library/react` for components, and hit a real staging DB for model integration tests. Use whenever the user writes, runs, or debugs tests in pabriq-app-v2, even if they don't say "testing".
---

# pabriq-app-v2 — Testing

Testing in pabriq-app-v2 uses Vitest for unit, component, and DB integration tests, and Playwright for end-to-end browser tests. Tests are co-located with the code they exercise. Model integration tests run against a real staging database via Infisical secrets.

> Read `../pabriq-app-v2-foundation/references/codebase-profile.md` first for the stack, architecture, and tooling context. This skill adds the testing-specific details.

## ⚠️ SAFETY RULE — NEVER run vitest directly

**`vitest.config.ts` has a hard abort if `VITEST_FROM_SCRIPT` is not set.** Running `npx vitest` or `vitest run` directly will `process.exit(1)` immediately. The `bun run test` script sets `VITEST_FROM_SCRIPT=true` and runs through `load-env-test` (Infisical staging secrets). The setup file (`src/test/setup.ts`) also validates `DATABASE_URL` is present and warns if not running through the project script.

```bash
# CORRECT — always use this
bun run test

# WRONG — will abort with ❌ SAFETY ABORT
npx vitest run
vitest run src/features/products
```

To run a single test file:
```bash
bun run test -- src/features/products/model.test.ts
```

## Where things live

| What | Path | Notes |
|---|---|---|
| Vitest config | `vitest.config.ts` | happy-dom, globals, safety check |
| Test setup | `src/test/setup.ts` | jest-dom matchers, matchMedia mock, DB URL guard |
| Model integration tests | `src/features/*/model.test.ts` | Hit real staging DB |
| Pure unit tests | `src/features/pricing/engine.test.ts` | No DB, no React |
| Permission guard tests | `src/features/permissions/model.test.ts` | Pure function tests |
| Component tests | `src/components/**/*.test.tsx` | `@testing-library/react` + IntlProvider |
| Route guard tests | `src/routes/-route-guards.test.tsx` | TanStack Router memory history |
| Route-level tests | `src/routes/_org/customers/-customer-routes.test.tsx` | Per-route-group guards |
| Playwright config | `playwright.config.ts` | chromium, `bun run dev` webServer |
| E2E specs | `e2e/*.spec.ts` | auth, onboarding, auth-redirect |
| E2E helpers | `e2e/helpers/auth.ts` | `gotoApp`, `signIn`, `signUp`, `setLocale` |

## How we do testing here

### Deep Module Unit Tests

Pure functions, no React rendering, no DB. Test the logic directly:

> from `src/features/permissions/model.test.ts`
```typescript
import { describe, expect, it } from 'vitest'
import { canManageMembers, canManageProducts, type Role } from './model'

const roles: Role[] = ['owner', 'admin', 'member']

function expectPermissions(fn: (role: Role) => boolean, allowed: Role[]) {
  for (const role of roles) {
    const expected = allowed.includes(role)
    expect(fn(role), `role=${role}`).toBe(expected)
  }
}

describe('canManageMembers', () => {
  it('allows owner and admin', () => {
    expectPermissions(canManageMembers, ['owner', 'admin'])
  })
})
```

> from `src/features/pricing/engine.test.ts`
```typescript
import { describe, expect, it } from 'vitest'
import { calculateUnitPrice } from './engine'

describe('calculateUnitPrice', () => {
  it('returns exact breakpoint price for matching quantity', () => {
    const result = calculateUnitPrice({ quantity: 100, breakpoints: [...] })
    expect(result).toEqual({ unitPrice: 12.5, mode: 'interpolation' })
  })

  it('returns error for empty breakpoints', () => {
    const result = calculateUnitPrice({ quantity: 100, breakpoints: [] })
    expect(result).toEqual({ error: 'No breakpoints defined' })
  })
})
```

### Model Integration Tests

Hit a real staging database. Use `beforeEach` to truncate and seed. Test CRUD and org isolation:

> from `src/features/products/model.test.ts`
```typescript
import { sql } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '#/db/index'
import { organization, products as productsTable } from '#/db/schema'
import { createProduct, listProducts, deleteProduct } from './model'

const org1Id = '00000000-0000-0000-0000-000000000001'
const org2Id = '00000000-0000-0000-0000-000000000002'

beforeEach(async () => {
  await db.execute(sql`TRUNCATE organization, biteship_areas CASCADE`)
  await db.insert(organization).values([
    { id: org1Id, name: 'Org 1', slug: 'org-1' },
    { id: org2Id, name: 'Org 2', slug: 'org-2' },
  ])
})

describe('products', () => {
  it('creates a product and returns it', async () => {
    const product = await createProduct({ orgId: org1Id, name: 'Custom T-Shirt' })
    expect(product.id).toBeDefined()
    expect(product.name).toBe('Custom T-Shirt')
    expect(product.orgId).toBe(org1Id)
  })

  it('lists products by org and does not leak across orgs', async () => {
    await createProduct({ orgId: org1Id, name: 'P1' })
    await createProduct({ orgId: org2Id, name: 'Other Org Product' })
    const products = await listProducts({ orgId: org1Id })
    expect(products).toHaveLength(1)
  })
})
```

### Component Tests

Use `@testing-library/react` with an `IntlProvider` wrapper. Components using `useTranslations` will crash without it:

> from `src/components/status-badge.test.tsx`
```typescript
import { render, screen } from '@testing-library/react'
import { IntlProvider } from 'use-intl'
import { describe, expect, it } from 'vitest'
import { StatusBadge } from './status-badge'

const testMessages = {
  status: { draft: 'Draft', pending: 'Pending', active: 'Active' },
}

function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <IntlProvider locale="en" messages={testMessages}>
      {children}
    </IntlProvider>
  )
}

describe('StatusBadge', () => {
  it('renders the status label for a known status', () => {
    render(
      <TestWrapper>
        <StatusBadge status="draft" />
      </TestWrapper>,
    )
    expect(screen.getByText('Draft')).toBeDefined()
  })
})
```

### Route Guard Tests

Build a TanStack Router in-memory, mock session/org functions with `vi.fn()`, assert redirects:

> from `src/routes/-route-guards.test.tsx`
```typescript
import {
  createMemoryHistory, createRootRoute, createRoute,
  createRouter, Outlet, RouterProvider, redirect,
} from '@tanstack/react-router'
import { act, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetCurrentSession = vi.fn<() => Promise<MockSession | null>>()
const mockListUserOrgs = vi.fn<() => Promise<Array<MockOrg>>>()

function buildProtectedRouter(initialEntry: string) {
  const rootRoute = createRootRoute({ component: ProtectedLayout })
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    beforeLoad: async () => {
      const session = await mockGetCurrentSession()
      if (!session) throw redirect({ to: '/sign-in', search: { redirect: '/' } })
      const orgs = await mockListUserOrgs()
      if (orgs.length === 0) throw redirect({ to: '/onboarding' })
    },
    component: () => <div>Dashboard Page</div>,
  })
  // ... add more routes, return createRouter(...)
}

describe('workspace route guards', () => {
  it('redirects unauthenticated users from / to sign-in', async () => {
    mockGetCurrentSession.mockResolvedValue(null)
    mockListUserOrgs.mockResolvedValue([])
    const router = buildProtectedRouter('/')
    await router.load()
    await renderRouter(router)
    expect(await screen.findByText('Sign In Page')).toBeDefined()
  })
})
```

### E2E Tests (Playwright)

Run against a live dev server on `localhost:3001`. Use helpers from `e2e/helpers/auth.ts`:

> from `e2e/auth.spec.ts`
```typescript
import { expect, test } from '@playwright/test'
import { gotoApp, signIn } from './helpers/auth'

test.describe('Authentication', () => {
  test('shows sign-in form with all fields', async ({ page }) => {
    await gotoApp(page, '/sign-in')
    await expect(
      page.locator('[data-slot="card-title"]').filter({ hasText: 'Sign in' }),
    ).toBeVisible()
    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()
  })

  test('shows error with invalid credentials', async ({ page }) => {
    await gotoApp(page, '/sign-in')
    await page.getByLabel('Email').fill('wrong@example.com')
    await page.getByLabel('Password').fill('wrongpassword')
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page).toHaveURL(/\/sign-in/)
  })
})
```

> from `e2e/helpers/auth.ts`
```typescript
export async function gotoApp(page: Page, path: string) {
  await setLocale(page)
  await page.goto(path)
  await page.waitForLoadState('load')
  await waitForHydration(page)  // waits for React fiber on form element
}
```

## Commands

| Command | What it does |
|---|---|
| `bun run test` | Vitest via load-env-test (staging DB). **Always use this.** |
| `bun run test -- <path>` | Run a single test file |
| `bun run test:e2e` | Playwright E2E tests |
| `bun run test:e2e:headed` | Playwright in headed browser |
| `bun run test:e2e:debug` | Playwright with debug CLI |
| `bun run check` | Biome lint + format |
| `bun run typecheck` | `tsc --noEmit` |

### Targeted testing (preferred)

**Always run only the test files relevant to your changes.** The full suite is slow because integration tests hit a real database. Running it when you only changed one feature wastes time and increases flaky-test noise.

```bash
# Run a single test file (preferred for most tasks)
bun run test -- src/features/products/model.test.ts

# Run all tests in a feature directory
bun run test -- src/features/production/

# Full suite — only for final handoff or pre-commit
bun run test
```

Rule of thumb:
- Changed a model → run its `model.test.ts`
- Changed a component → run its `.test.tsx`
- Changed a utility → run its `.test.ts`
- Touched routes/server functions → `bun run build` first, then targeted tests
- Final handoff → full suite to catch cross-feature regressions

**Pre-commit pipeline**: `bun run check && bun run typecheck && bun run test`. For route/server changes: also `bun run build`.

## Conventions observed

- **Co-location**: test files live next to the file they test — `file.test.ts` tests `file.ts`
- **Globals**: `describe`, `it`, `expect`, `beforeEach`, `vi` are all global from vitest config — no import needed for test globals (but `vi` must be imported)
- **Happy-dom**: the test environment is `happy-dom` (not jsdom), configured in `vitest.config.ts`
- **File parallelism disabled**: `fileParallelism: false` in vitest config — tests run sequentially to avoid DB conflicts
- **Test files follow source naming**: `*.test.ts` for logic, `*.test.tsx` for React components/hooks, `*.spec.ts` for Playwright E2E
- **E2E helpers**: shared page actions live in `e2e/helpers/`, not duplicated across spec files
- **DB cleanup**: integration tests use `TRUNCATE ... CASCADE` in `beforeEach` — no test isolation library, just direct SQL
- **IntlProvider wrapper**: every component using `useTranslations` MUST be wrapped in `<IntlProvider locale="en" messages={testMessages}>` with only the keys needed
- **Minimal test messages**: define only the keys the test exercises, not the full i18n catalog
- **Org isolation**: model integration tests always seed multiple orgs and assert data doesn't leak across `orgId` boundaries
- **Playwright helpers**: shared helpers in `e2e/helpers/auth.ts` handle locale, hydration, and form filling
- **No snapshot tests** for full pages — assert specific user-visible behavior
- **`@testing-library/react`**: use `render`, `screen`, `act` from testing-library; prefer `getByText` / `findByText` / `getByRole`

## Anti-patterns to avoid

- **NEVER run `vitest` directly** — always use `bun run test` which sets `VITEST_FROM_SCRIPT=true` and loads env via Infisical
- **NEVER use `jest` imports** — this project uses Vitest with globals
- **NEVER forget `IntlProvider`** — components using `useTranslations` will crash
- **NEVER write snapshot tests for full pages** — test specific behavior instead
- **NEVER mock your own modules** — mock at system boundaries (external APIs, DB) only
- **NEVER trust client-provided `orgId` in tests** — model tests verify org isolation from the server side
- **NEVER use `process.env.DATABASE_URL` directly** — always go through `bun run test` which sets it via Infisical
- **No `describe.skip` or `it.skip`** as a habit — if a test can't run, fix it or delete it; skip accumulates debt
- **Don't place tests in a separate `__tests__/` directory** — this repo co-locates tests next to source
- **Don't add `jsdom`** — the project uses `happy-dom`; switching creates subtle DOM API differences

## Gaps / verify

- **No coverage configuration** — there is no `coverage` block in `vitest.config.ts` and no coverage threshold is enforced. Verify before adding coverage expectations.
- **No `@playwright/test` in devDependencies** — Playwright is available via the system install or `npx`, not declared in `package.json`. Verify the Playwright version matches expectations.
- **E2E tests depend on a running app** — the Playwright config starts `bun run dev` automatically via `webServer`, but the staging DB must be reachable. The `load-env-test` script handles this via Infisical.
- **Sparse component test coverage** — only a few components have `.test.tsx` files. Most components are untested. Verify what coverage exists before writing new tests.
- `--passWithNoTests` flag allows feature branches with no tests yet, but new features MUST add tests before being considered complete.
- Model integration tests depend on the staging database being available via Infisical. If `load-env-test` fails, tests cannot run.
- The `src/test/setup.ts` safety check warns (but doesn't abort) if `INFISICAL_ENVIRONMENT` or `NODE_ENV` are not set correctly — verify environment if tests hit unexpected data.
