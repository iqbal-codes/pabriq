---
name: pabriq-app-v2-testing
description: How testing is done in the pabriq-app-v2 codebase. Vitest runs co-located unit/component/integration tests in happy-dom; Playwright runs E2E tests in `e2e/`. Tests live next to source (`*.test.tsx`, `*.test.ts`), use `@testing-library/react` for components, and hit a real staging DB for model integration tests. Use whenever the user writes, runs, or debugs tests in pabriq-app-v2, even if they don't say "testing".
---

# pabriq-app-v2 — Testing

Testing uses **Vitest** for unit, component, and DB integration tests, and **Playwright** for end-to-end browser tests. Tests are co-located with the code they exercise. Model integration tests run against a real staging database via Infisical secrets.

> Read `../pabriq-app-v2-foundation/references/codebase-profile.md` first for stack/architecture context.

## ⚠️ SAFETY RULE — NEVER run vitest directly

**`vitest.config.ts` has a hard abort if `VITEST_FROM_SCRIPT` is not set.** Running `npx vitest` or `vitest run` directly will `process.exit(1)`. The `bun run test` script sets `VITEST_FROM_SCRIPT=true` and runs through `load-env-test` (Infisical staging secrets). The setup file (`src/test/setup.ts`) also validates `DATABASE_URL` is present.

```bash
# CORRECT
bun run test

# WRONG — will abort with ❌ SAFETY ABORT
npx vitest run
```

Single file: `bun run test -- src/features/products/model.test.ts`

## Where things live

| What | Path | Notes |
|---|---|---|
| Vitest config | `vitest.config.ts` | happy-dom, globals, safety check |
| Test setup | `src/test/setup.ts` | jest-dom matchers, matchMedia mock, DB URL guard |
| Model integration tests | `src/features/*/model.test.ts` | Hit real staging DB |
| Pure unit tests | `src/features/pricing/engine.test.ts` | No DB, no React |
| Permission guard tests | `src/features/permissions/model.test.ts` | Pure function tests |
| Component tests | `src/components/**/*.test.tsx` | `@testing-library/react` + IntlProvider |
| Form component tests | `src/components/app/form/date-field.test.tsx` | IntlProvider + PointerCapture polyfills |
| Form-sheet tests | `src/features/*/components/*-form-sheet.test.tsx` | QueryClientProvider + hook mocks |
| Order page tests | `src/features/orders/pages/view-order-page.test.tsx` | Shallow stubs for complex child trees |
| Order component tests | `src/features/orders/components/*.test.tsx` | Modal, line-items, invoices, actions |
| Production tests | `src/features/production/components/*.test.tsx` | TaskDetailModal, stage-list, kanban |
| Customer form tests | `src/features/customers/components/customer-form-sheet.test.tsx` | Create/edit mode |
| Route guard tests | `src/routes/-route-guards.test.tsx` | TanStack Router memory history |
| Playwright config | `playwright.config.ts` | chromium, `bun run dev` webServer |
| E2E specs | `e2e/*.spec.ts` | auth, auth-redirect, onboarding |
| E2E helpers | `e2e/helpers/auth.ts` | `gotoApp`, `signIn`, `signUp`, `setLocale`, `completeOnboarding`, `waitForAuthenticated` |

## How we do testing here

### Pure Unit Tests

No React rendering, no DB. Test logic directly:

> `src/features/permissions/model.test.ts`
```typescript
import { describe, expect, it } from 'vitest'
import { canManageMembers, type Role } from './model'

const roles: Role[] = ['owner', 'admin', 'member']

function expectPermissions(fn: (role: Role) => boolean, allowed: Role[]) {
  for (const role of roles) {
    expect(fn(role), `role=${role}`).toBe(allowed.includes(role))
  }
}

describe('canManageMembers', () => {
  it('allows owner and admin', () => {
    expectPermissions(canManageMembers, ['owner', 'admin'])
  })
})
```

### Model Integration Tests

Hit a real staging database. Use `beforeEach` to `TRUNCATE ... CASCADE` and seed. Always test org isolation:

> `src/features/products/model.test.ts`
```typescript
import { sql } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '#/db/index'
import { organization } from '#/db/schema'
import { createProduct, listProducts } from './model'

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
    expect(product.orgId).toBe(org1Id)
  })

  it('does not leak across orgs', async () => {
    await createProduct({ orgId: org1Id, name: 'P1' })
    await createProduct({ orgId: org2Id, name: 'Other' })
    expect(await listProducts({ orgId: org1Id })).toHaveLength(1)
  })
})
```

### Component Tests — IntlProvider Wrapper

Every component using `useTranslations` MUST be wrapped in `<IntlProvider>`. Define only the keys the test exercises:

> `src/components/status-badge.test.tsx`
```typescript
import { render, screen } from '@testing-library/react'
import { IntlProvider } from 'use-intl'
import { describe, expect, it } from 'vitest'
import { StatusBadge } from './status-badge'

const testMessages = { status: { draft: 'Draft', pending: 'Pending', active: 'Active' } }

function TestWrapper({ children }: { children: React.ReactNode }) {
  return <IntlProvider locale="en" messages={testMessages}>{children}</IntlProvider>
}

describe('StatusBadge', () => {
  it('renders the status label', () => {
    render(<TestWrapper><StatusBadge status="draft" /></TestWrapper>)
    expect(screen.getByText('Draft')).toBeDefined()
  })
})
```

### Form Components — Radix UI + PointerCapture Polyfills

Components using Radix UI primitives (DatePicker, Dialog, Select) need PointerCapture polyfills in happy-dom:

> `src/components/app/form/date-field.test.tsx`
```typescript
if (!HTMLElement.prototype.setPointerCapture) {
  Object.defineProperty(HTMLElement.prototype, 'setPointerCapture', {
    value: vi.fn(), writable: true,
  })
}
// Same for releasePointerCapture and hasPointerCapture
```

### Form-Sheet Tests — QueryClientProvider + Hook Mocks

Form-sheet components mock `@tanstack/react-router`, `use-intl`, and feature hooks. Wrap in `QueryClientProvider`:

> `src/features/products/components/product-form-sheet.test.tsx`
```typescript
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }) => <a href={to}>{children}</a>,
  useNavigate: () => vi.fn(),
  useParams: () => ({}),
  useRouteContext: () => ({ org: { id: 'org-1' } }),
}))

vi.mock('use-intl', () => ({
  useTranslations: (ns?: string) => (key: string) => ns ? `${ns}.${key}` : key,
  useLocale: () => 'en',
  IntlProvider: ({ children }) => children,
}))

vi.mock('#/features/products/hooks', () => ({
  useProduct: vi.fn((id) => ({ data: id ? { id, name: 'T-Shirt' } : undefined, isLoading: false })),
  useCreateProduct: vi.fn(() => ({ mutateAsync: vi.fn().mockResolvedValue({ ok: true }) })),
  useUpdateProduct: vi.fn(() => ({ mutateAsync: vi.fn().mockResolvedValue({ ok: true }) })),
}))

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
function TestWrapper({ children }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
```

When `use-intl` is fully mocked, the `IntlProvider` mock is a pass-through — only `QueryClientProvider` is needed. Same pattern for `OrderFormSheet` (`src/features/orders/components/order-form-sheet.test.tsx`) and `CustomerFormSheet` (`src/features/customers/components/customer-form-sheet.test.tsx`).

### Complex Page Tests — Shallow Component Stubs

For pages with deep component trees (ViewOrderPage), mock hooks at their import path and stub complex child components:

> `src/features/orders/pages/view-order-page.test.tsx`
```typescript
// Hook mocks at import boundary
vi.mock('#/features/orders/hooks', () => ({ ... }))
vi.mock('#/features/invoices/hooks', () => ({ ... }))
vi.mock('#/features/production/hooks', () => ({ ... }))
vi.mock('#/features/products/hooks', () => ({ ... }))

// Shallow stubs for complex child components
vi.mock('#/features/orders/components/order-line-items-card', () => ({
  OrderLineItemsCard: () => <div data-testid="order-line-items-card" />,
}))
vi.mock('#/features/portal/components/order-flow-timeline', () => ({
  OrderFlowTimeline: () => <div data-testid="order-flow-timeline" />,
}))
vi.mock('#/features/orders/components/order-quantity-adjustment-modal', () => ({
  OrderQuantityAdjustmentModal: () => null,
}))
```

Stub pattern: `<div data-testid="...">` for elements you assert on, `null` for modals/overlays.

### Modal Tests — vi.hoisted + userEvent

Modal components use `vi.hoisted` for mutation mocks that need `beforeEach` reset:

> `src/features/production/components/task-detail-modal.test.tsx`
```typescript
const mutationMocks = vi.hoisted(() => ({
  advanceTaskMutate: vi.fn(),
  saveCommentMutate: vi.fn(),
}))

beforeEach(() => {
  mutationMocks.advanceTaskMutate.mockReset()
  mutationMocks.advanceTaskMutate.mockResolvedValue({ ok: true })
  mutationMocks.saveCommentMutate.mockReset()
  mutationMocks.saveCommentMutate.mockResolvedValue({ ok: true })
})

vi.mock('../hooks', () => ({
  useAdvanceTask: () => ({ mutateAsync: mutationMocks.advanceTaskMutate }),
  useSaveComment: () => ({ mutateAsync: mutationMocks.saveCommentMutate }),
}))
```

`vi.hoisted` ensures mocks are available before `vi.mock` hoisting. Same pattern in `OrderQuantityAdjustmentModal` (`src/features/orders/components/order-quantity-adjustment-modal.test.tsx`). Use `@testing-library/userEvent` for interactions.

### Order Component Tests — Server Function Mocks

Some components also mock server functions directly:

> `src/features/orders/components/order-line-items-card.test.tsx`
```typescript
const mocks = vi.hoisted(() => ({
  getAssetsForLineItemFn: vi.fn(),
  getAssetSignedUrl: vi.fn(),
}))

vi.mock('#/features/orders/server', () => ({
  getAssetsForLineItemFn: mocks.getAssetsForLineItemFn,
}))
```

### Route Guard Tests

Build a TanStack Router in-memory, mock session/org, assert redirects:

> `src/routes/-route-guards.test.tsx`
```typescript
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
    },
    component: () => <div>Dashboard Page</div>,
  })
}
```

### E2E Tests (Playwright)

Run against a live dev server on `localhost:3001`:

> `e2e/auth.spec.ts`
```typescript
import { expect, test } from '@playwright/test'
import { gotoApp } from './helpers/auth'

test('shows sign-in form', async ({ page }) => {
  await gotoApp(page, '/sign-in')
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()
})
```

> `e2e/helpers/auth.ts` — shared helpers:
> - `setLocale(page, locale?)` — sets locale cookie
> - `gotoApp(page, path)` — sets locale, navigates, waits for React hydration
> - `signIn(page, email, password)` — fills sign-in form and submits
> - `signUp(page, name, email, password)` — fills sign-up form and submits
> - `completeOnboarding(page, orgName)` — fills onboarding form and submits
> - `waitForAuthenticated(page)` — waits for redirect away from auth pages

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

Always run only test files relevant to your changes. The full suite is slow because integration tests hit a real DB.

```bash
# Single file (preferred)
bun run test -- src/features/products/model.test.ts

# All tests in a feature directory
bun run test -- src/features/production/

# Full suite — only for final handoff or pre-commit
bun run test
```

Rule of thumb:
- Changed a model → run its `model.test.ts`
- Changed a component → run its `.test.tsx`
- Changed a utility → run its `.test.ts`
- Touched routes/server functions → `bun run build` first, then targeted tests
- Final handoff → full suite

**Pre-commit pipeline**: `bun run check && bun run typecheck && bun run test`. For route/server changes: also `bun run build`.

## Conventions observed

- **Co-location**: test files live next to the file they test (`file.test.ts` tests `file.ts`)
- **Globals**: `describe`, `it`, `expect`, `beforeEach` are global from vitest config (but `vi` and `vitest` must be imported)
- **Happy-dom**: test environment is `happy-dom` (not jsdom), configured in `vitest.config.ts`
- **File parallelism disabled**: `fileParallelism: false` — tests run sequentially to avoid DB conflicts
- **Naming**: `*.test.ts` for logic, `*.test.tsx` for React, `*.spec.ts` for Playwright E2E
- **E2E helpers**: shared page actions in `e2e/helpers/`, not duplicated across specs
- **DB cleanup**: `TRUNCATE ... CASCADE` in `beforeEach` — no test isolation library
- **IntlProvider**: wrap components using `useTranslations` with only the keys the test exercises
- **Form-sheet mock stack**: mock router + use-intl + feature hooks, wrap in QueryClientProvider
- **Org isolation**: model tests seed multiple orgs and assert no data leaks across `orgId`
- **Shallow stubs**: mock complex children as `<div data-testid="...">` or `null`
- **vi.hoisted**: use for mock references needed in `beforeEach` and `vi.mock` closures
- **PointerCapture polyfills**: needed for Radix UI primitives in happy-dom
- **`@testing-library/react`**: use `render`, `screen`, `waitFor`, `act`; prefer `getByText` / `findByText` / `getByRole`
- **`@testing-library/userEvent`**: use for click/type interactions in modal and form tests

## Anti-patterns to avoid

- **NEVER run `vitest` directly** — always `bun run test` (sets `VITEST_FROM_SCRIPT=true`)
- **NEVER use `jest` imports** — this project uses Vitest with globals
- **NEVER forget `IntlProvider`** — components using `useTranslations` will crash
- **NEVER write snapshot tests for full pages** — assert specific behavior
- **NEVER mock your own modules** — mock at system boundaries (external APIs, DB)
- **NEVER trust client-provided `orgId` in tests** — verify org isolation server-side
- **NEVER use `process.env.DATABASE_URL` directly** — always `bun run test` sets it via Infisical
- **No `describe.skip` or `it.skip` as habit** — fix or delete; skip accumulates debt
- **Don't place tests in `__tests__/`** — co-locate next to source
- **Don't add `jsdom`** — use `happy-dom`; switching creates subtle DOM differences
- **Don't forget `QueryClientProvider`** — components using TanStack Query hooks will fail without it

## Gaps / verify

- **No coverage config** — no `coverage` block in `vitest.config.ts`, no threshold enforced
- **E2E depends on running app** — Playwright starts `bun run dev` via `webServer`, staging DB must be reachable
- **`--passWithNoTests`** allows branches without tests, but new features MUST add tests
- **Model tests depend on staging DB** via Infisical — if `load-env-test` fails, tests can't run
- `src/test/setup.ts` warns (but doesn't abort) if env vars are wrong — verify if tests hit unexpected data
