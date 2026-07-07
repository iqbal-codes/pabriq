---
name: pabriq-app-v2-backend
description: How backend work is done in the pabriq-app-v2 codebase: server functions live in src/features/*/server.ts and call model functions in src/features/*/model.ts using Drizzle ORM; session/org resolution uses Better Auth via src/lib/auth-session-server.ts; raw HTTP API routes live in src/routes/api/. Use whenever the user adds or edits server functions, model queries, API routes, auth logic, or backend data access in pabriq-app-v2, even if they don't say 'backend'.
---

# pabriq-app-v2 — Backend

All server-side business logic lives in `src/features/*/server.ts` (TanStack Start `createServerFn` wrappers) calling pure DB queries in `src/features/*/model.ts` (Drizzle ORM). Auth uses Better Auth with an organization plugin; every business table is org-scoped. Raw HTTP API routes exist only at `src/routes/api/` for third-party webhooks and the Better Auth catch-all.

> Read `../pabriq-app-v2-foundation/references/codebase-profile.md` first for the stack, architecture, and tooling context. This skill adds the backend-specific details.

## Where things live

| Purpose | Path |
|---|---|
| Server functions (createServerFn) | `src/features/*/server.ts` |
| Pure business logic + DB queries | `src/features/*/model.ts` |
| TanStack Query hooks | `src/features/*/hooks.ts` |
| Auth server setup | `src/lib/auth.ts` |
| Auth client | `src/lib/auth-client.ts` |
| Org resolution (server-only) | `src/lib/auth-session-server.ts` |
| Session / org context (client-safe) | `src/lib/auth-session.ts` |
| Org listing + creation | `src/features/auth/org.ts` |
| Permission guards | `src/features/permissions/model.ts` |
| DB schema (all tables) | `src/db/schema.ts` |
| Drizzle client | `src/db/index.ts` |
| Server logger middleware | `src/lib/server-logger-middleware.ts` |
| Validation schemas (Zod) | `src/lib/validation-schemas.ts` |
| Sort column utilities | `src/lib/sorting.ts` |
| Query key factory | `src/lib/query-keys.ts` |
| Shared result types | `src/lib/server-results.ts` |
| Asset upload (R2) | `src/features/assets/server.ts` |
| AI assistant (Mastra) | `src/mastra/` + `src/features/assistant/` |
| API routes (webhooks) | `src/routes/api/` |

For detailed reusable patterns, see `references/backend-patterns.md`.

## How we do backend here

### createServerFn — the core pattern

Every internal API call goes through `createServerFn`. Never use raw `fetch` for internal endpoints.

> from `src/features/customers/server.ts`
```typescript
export const createCustomerFn = createServerFn({ method: 'POST' })
  .inputValidator((input: CustomerInput) => input)
  .handler(
    async ({
      data,
    }): Promise<{ ok: true; id: string } | { ok: false; error: string }> => {
      const orgId = await resolveOrgId()
      try {
        const id = await createCustomer({ ...data, orgId })
        return { ok: true, id }
      } catch (e) {
        return {
          ok: false,
          error: e instanceof Error ? e.message : 'Unknown error',
        }
      }
    },
  )
```

Key rules:
- `.inputValidator()` is mandatory — never trust raw client input
- `.handler()` must have an explicit return type (never `Promise<any>`)
- Dynamic-import `auth` and `db` inside the handler (avoids bundling server code client-side)

### Auth-session module separation

Server-only code lives in `src/lib/auth-session-server.ts`. Client-safe code (with `createServerFn`) lives in `src/lib/auth-session.ts`. This split prevents server-only imports from being bundled into client code.

> from `src/lib/auth-session-server.ts`
```typescript
// Resolves org ID from Better Auth session — dynamic-imports auth, db, schema
export async function resolveOrgId(): Promise<string> {
  const [{ getRequestHeaders }, { auth }, { db }, { member }, { eq }] =
    await Promise.all([
      import('@tanstack/react-start/server'),
      import('#/lib/auth'), import('#/db/index'),
      import('#/db/schema'), import('drizzle-orm'),
    ])
  const headers = getRequestHeaders()
  const session = await auth.api.getSession({ headers })
  if (!session) throw new Error('Not authenticated')
  // ... queries member table for first org membership
  return memberships[0].orgId
}
```

> from `src/lib/auth-session.ts`
```typescript
export const getCurrentSession = createServerFn({ method: 'GET' }).handler(async () => { ... })
export async function resolveOrgContext(): Promise<OrgContextResult> {
  // Returns { ok: true, session, org, role } | { ok: false, reason: 'unauthenticated' | 'no-org', session? }
}
```

**Import rules:**
- `src/features/*/server.ts` → import `resolveOrgId` from `#/lib/auth-session-server`
- `src/routes/_org.tsx` and other route guards → import `resolveOrgContext` from `#/lib/auth-session`
- Never import `resolveOrgId` from `#/lib/auth-session` (it lives in the `-server` module now)
### Dynamic imports pattern

Server functions always dynamic-import `auth`, `db`, and other server-only modules inside the handler. This prevents server code from being bundled into client code.

> from `src/features/orders/server.ts`
```typescript
export const listOrdersFn = createServerFn({ method: 'GET' })
  .inputValidator((data: ListOrdersParams) => data)
  .handler(async ({ data }): Promise<ListOrdersResult> => {
    const { listOrders } = await import('./model')
    return listOrders(data)
  })
```

Common pattern — parallelize org resolution with model import:

> from `src/features/products/server.ts`
```typescript
const [orgId, { getProduct }] = await Promise.all([
  resolveOrgId(),
  import('./model'),
])
return getProduct(data.id, orgId)
```

### Cross-feature model calls

Server functions can import model functions from other features when needed (e.g., order timeline for admin views):

> from `src/features/orders/server.ts`
```typescript
export const getOrderAdminTimelineFn = createServerFn({ method: 'GET' })
  .inputValidator((input: { orderId: string; orgId: string }) => input)
  .handler(async ({ data }) => {
    const { getOrderTimelineByOrderId } = await import(
      '#/features/portal/model'
    )
    return getOrderTimelineByOrderId(data.orderId, data.orgId)
  })
```

### Validation with Zod

For mutations, use Zod schemas inside `.inputValidator()` for runtime validation. Shared schemas live in `src/lib/validation-schemas.ts`.

> from `docs/agents/boilerplate/server-functions.md`
```typescript
const createItemSchema = z.object({
  name: z.string().min(1),
  price: z.number().positive(),
})

export const createItemFn = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => createItemSchema.parse(input))
  .handler(async ({ data }): Promise<Item> => { ... })
```

### Error handling — discriminated unions

Mutations return `MutationResult` (or equivalent). Never throw to the caller from server functions — catch and return the error in the result type.

> from `src/lib/server-results.ts`
```typescript
export type MutationResult = { ok: true } | { ok: false; error: string }
```

Pattern: `try { await fn(); return { ok: true } } catch (e) { return { ok: false, error: e instanceof Error ? e.message : 'Unknown error' } }`

### Model-layer domain types

Model functions define their own input/output types co-located in `model.ts`. Optional fields with clear defaults enable flexible inputs:

> from `src/features/invoices/model.ts`
```typescript
export type CreateInvoiceInput = {
  orderId?: string
  customerId: string
  lineItems: Array<{ description: string; quantity: number; unitPrice: number }>
  percentage?: number
  customProductTotal?: number  // overrides calculated product total
  dueDate: string
  // ...
}
```

### Server logger middleware

Attach `serverLoggerMiddleware` to server functions that need duration logging and Sentry error reporting. See `src/lib/server-logger-middleware.ts` for the full implementation.

> from `src/lib/server-logger-middleware.ts`
```typescript
// Wraps handler: logs fn name + duration on success, logs error + captures to Sentry on failure
export const serverLoggerMiddleware = createMiddleware({ type: 'function' })
  .server(async ({ next, serverFnMeta }) => { ... })
```

Usage:
```typescript
export const myFn = createServerFn({ method: 'GET' })
  .middleware([serverLoggerMiddleware])
  .handler(async ({ data }) => { ... })
```
### Column narrowing

Always select only the columns you need. Never use `db.select().from(table)`. Parallelize data + count queries:

> from `src/features/products/server.ts`
```typescript
const [rows, countResult] = await Promise.all([
  db.select({ id: productsTable.id, name: productsTable.name })
    .from(productsTable).where(allConditions).orderBy(orderBy).limit(perPage).offset(offset),
  db.select({ count: sql<number>`count(*)` }).from(productsTable).where(allConditions),
])
```

### Sort column maps

Server-side sorting uses `buildOrderBy` with a `SortColumnMap` from `src/lib/sorting.ts`:

> from `src/features/products/server.ts`
```typescript
const PRODUCT_SORT_COLUMNS = {
  name: productsTable.name,
  createdAt: { expression: productsTable.createdAt, nulls: 'last' },
  basePrice: productsTable.basePrice,
} satisfies SortColumnMap
```

### Query key factory

All TanStack Query keys use the centralized `queryKeys` factory from `src/lib/query-keys.ts`. Keys follow an `all → lists → list(filters)` / `all → details → detail(id)` hierarchy.

> from `src/lib/query-keys.ts`
```typescript
export const queryKeys = {
  products: {
    all: ['products'] as const,
    lists: () => [...queryKeys.products.all, 'list'] as const,
    list: (filters: { orgId: string; search?: string }) =>
      [...queryKeys.products.lists(), filters] as const,
    details: () => [...queryKeys.products.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.products.details(), id] as const,
    // domain-specific sub-keys: breakpoints, addons, pricing
  },
  orders: {
    all: ['orders'] as const,
    lists: () => [...queryKeys.orders.all, 'list'] as const,
    list: (filters: { orgId: string; status?: string }) =>
      [...queryKeys.orders.lists(), filters] as const,
    details: () => [...queryKeys.orders.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.orders.details(), id] as const,
    creationReadiness: () => [...queryKeys.orders.all, 'creation-readiness'] as const,
    history: (id: string) => [...queryKeys.orders.details(), id, 'history'] as const,
    adminTimeline: (id: string) => [...queryKeys.orders.details(), id, 'admin-timeline'] as const,
  },
  // Same pattern for: invoices, portal, production, address, notifications, assistant
}
```

Domains: `products`, `customers`, `orders`, `assets`, `invoices`, `portal`, `address`, `production`, `notifications`, `assistant`. When adding a new domain, follow the hierarchy. Include filter params in the key for automatic cache separation.
### Permission guards

Role-based access checks use pure functions from `src/features/permissions/model.ts`. The `Role` type is `'owner' | 'admin' | 'member'`.

> from `src/features/permissions/model.ts`
```typescript
// Owner/admin only: canManageMembers, canManageProducts, canApproveOrders,
// canManageInvoices, canManageCustomers, canManageStages, canManageSettings, etc.
// All roles: canCreateOrders, canViewProduction, canAdvanceProductionTask
export function canManageMembers(role: Role): boolean { return role === 'owner' || role === 'admin' }
export function canCreateOrders(role: Role): boolean { return role === 'owner' || role === 'admin' || role === 'member' }
```

Usage in server functions:
```typescript
import { canApproveOrders } from '#/features/permissions/model'
const role = org.role as Role
if (!canApproveOrders(role)) {
  return { ok: false, error: 'Insufficient permissions' }
}
```

### Route guards

The `_org.tsx` layout guards all org-scoped routes. It uses `resolveOrgContext()` and redirects unauthenticated users to `/sign-in`.

> from `src/routes/_org.tsx`
```typescript
export const Route = createFileRoute('/_org')({
  beforeLoad: async ({ location }) => {
    const result = await resolveOrgContext()
    if (!result.ok) {
      if (result.reason === 'unauthenticated') {
        throw redirect({ to: '/sign-in', search: { redirect: location.href } })
      }
      throw redirect({ to: '/onboarding' })
    }
    return { session: result.session, org: result.org, role: result.role }
  },
  component: OrgLayout,
})
```

### AI Assistant & Mastra Agent Integration

Conversational AI logic uses Mastra. The main Mastra instance is configured in `src/mastra/index.ts` with custom tools linked to feature model functions.

> from `src/features/assistant/server.ts`
```typescript
export const sendAssistantMessageFn = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ message: z.string().trim().min(1).max(2000) }))
  .handler(async (ctx): Promise<{ ok: true; message: AssistantChatMessage } | { ok: false; error: string }> => {
    // resolves org context and calls Mastra agent with business search/overview tools
  })
```

### Payment reconciliation (Midtrans)

Online payments use the Midtrans snap token and reconciliation helpers to ensure database consistency.

> from `src/features/invoices/server.ts`
```typescript
export const reconcileInvoicePaymentFn = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ invoiceId: z.string() }))
  .handler(async ({ data }): Promise<ReconcilePaymentResponse> => {
    // queries Midtrans Snap API directly to verify transaction status
  })
```

## Commands

All from `package.json` scripts. **MUST use `bun run`, never invoke tools directly.**

| Command | Notes |
|---|---|
| `bun run dev` | Dev server on port 3001 |
| `bun run build` | Vite build |
| `bun run start:prod` | Production server |
| `bun run typecheck` | `tsc --noEmit` |
| `bun run check` | Biome lint + format check |
| `bun run db:generate` | Generate Drizzle migrations |
| `bun run db:migrate` | Apply migrations |
| `bun run db:push` | Push schema directly (dev only) |
| `bun run db:studio` | Open Drizzle Studio |
| `bun run test` | Vitest (staging DB) |

**Pre-commit pipeline**: `bun run check && bun run typecheck && bun run test`. For route/server changes: also `bun run build`.

## Conventions observed

- Server functions live in `src/features/*/server.ts`, model functions in `src/features/*/model.ts`
- Every handler has an explicit return type annotation
- Dynamic imports (`await import(...)`) for server-only modules inside every handler
- `Promise.all()` to parallelize `resolveOrgId()` with model imports
- `MutationResult` (`{ ok: true } | { ok: false; error: string }`) for all mutation returns
- Zod schemas in `src/lib/validation-schemas.ts` for shared validation; inline schemas for feature-specific
- `SortColumnMap` + `buildOrderBy` for all server-side sorting
- `queryKeys` factory from `src/lib/query-keys.ts` for all TanStack Query keys
- Import `resolveOrgId` from `#/lib/auth-session-server` in server functions (never from `#/lib/auth-session`)
- Import `resolveOrgContext` / `getCurrentSession` from `#/lib/auth-session` in route guards
- Biome style: single quotes, no semicolons (ASI), 2-space indent
- All internal imports use `#/` prefix alias

## Anti-patterns to avoid

- **No raw `fetch`** for internal API calls — always `createServerFn`
- **Never trust client `orgId`** — always `resolveOrgId()` from session, even when the route guard already resolved it
- **Never skip `.inputValidator()`** — every server function accepts input through the validator
- **Never use `db.select().from(table)`** — always narrow columns
- **Never use `LIKE '%term%'`** without a `pg_trgm` GIN index (prefix-only `term%` can use B-tree)
- **Never loop DB queries** when batch operations (`insert()` / `update()` / `delete()` accepting arrays) are possible
- **Never import `auth` or `db` at file top level** — dynamic import inside handler only
- **Never return thrown errors from mutations** — catch and return `{ ok: false, error }`
- **No `@/*` alias** for authored code — use `#/` (reserve `@/*` for shadcn/ui compatibility)
- **Never import `resolveOrgId` from `#/lib/auth-session`** — use `#/lib/auth-session-server` (the client module does not export it)

## Gaps / verify

- `src/lib/rls.ts` is referenced in `docs/agents/boilerplate/feature-module.md` as an `orgFilter` helper, but the file does not exist. The codebase uses `eq(table.orgId, orgId)` directly everywhere. Do not create this file — it appears to be a planned abstraction that was never implemented.
- `docs/agents/boilerplate/feature-module.md` shows `orgFilter('org_id')` in the model pattern, but live source never uses it. Follow live source.
- The `resolveOrgId()` helper does not take an org ID parameter — it always resolves the user's first membership. When a user can belong to multiple orgs (planned), this will need a `currentOrgId` parameter.
- The only allowed non-`createServerFn` backend route is `src/routes/api/auth/$.ts` (Better Auth catch-all).
