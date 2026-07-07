---
name: pabriq-app-v2-backend
description: How backend work is done in the pabriq-app-v2 codebase: server functions live in src/features/*/server.ts and call model functions in src/features/*/model.ts using Drizzle ORM; session/org resolution uses Better Auth via src/lib/auth-session.ts; raw HTTP API routes live in src/routes/api/. Use whenever the user adds or edits server functions, model queries, API routes, auth logic, or backend data access in pabriq-app-v2, even if they don't say 'backend'.
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
| Session / org resolution | `src/lib/auth-session.ts` |
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

### Org resolution

Every server function that touches business data MUST resolve the org from the authenticated session. The client-provided `orgId` is re-verified against the DB membership table.

> from `src/lib/auth-session.ts`
```typescript
export async function resolveOrgId(): Promise<string> {
  const [{ getRequestHeaders }, { auth }, { db }, { member }, { eq }] =
    await Promise.all([
      import('@tanstack/react-start/server'),
      import('#/lib/auth'),
      import('#/db/index'),
      import('#/db/schema'),
      import('drizzle-orm'),
    ])
  const headers = getRequestHeaders()
  const session = await auth.api.getSession({ headers })
  if (!session) throw new Error('Not authenticated')

  const memberships = await db
    .select({ orgId: member.organizationId })
    .from(member)
    .where(eq(member.userId, session.user.id))
    .limit(1)

  if (memberships.length === 0) throw new Error('No organization')
  return memberships[0].orgId
}
```

Three helpers exist — use the right one:
- `resolveOrgId()` — returns the org ID string; throws on failure. Use in server functions.
- `resolveOrgContext()` — returns discriminated union with session + org + role. Use in route guards.
- `getCurrentSession()` — returns the raw Better Auth session or null. Use for lightweight session checks.

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

Typical mutation error handling:
```typescript
try {
  await createItem({ ...data, orgId })
  return { ok: true }
} catch (e) {
  return {
    ok: false,
    error: e instanceof Error ? e.message : 'Unknown error',
  }
}
```

### Server logger middleware

Attach `serverLoggerMiddleware` to server functions that need duration logging and Sentry error reporting. The middleware logs functions and captures exceptions with error causes.

> from `src/lib/server-logger-middleware.ts`
```typescript
export const serverLoggerMiddleware = createMiddleware({
  type: 'function',
}).server(async ({ next, serverFnMeta }) => {
  const fnName = serverFnMeta?.name ?? 'unknown'
  const start = Date.now()
  try {
    const result = await next()
    const duration = Date.now() - start
    logger.info({ fn: fnName, durationMs: duration }, 'server fn complete')
    return result
  } catch (err: unknown) {
    const duration = Date.now() - start
    const message = err instanceof Error ? err.message : String(err)
    logger.error({ fn: fnName, durationMs: duration, err: message }, 'server fn error')
    sentryCaptureException(err)
    throw err
  }
})
```

Usage:
```typescript
export const myFn = createServerFn({ method: 'GET' })
  .middleware([serverLoggerMiddleware])
  .handler(async ({ data }) => { ... })
```

### Column narrowing

Always select only the columns you need. Never use `db.select().from(table)`.

> from `src/features/products/server.ts`
```typescript
const [rows, countResult] = await Promise.all([
  db.select({
    id: productsTable.id,
    name: productsTable.name,
    active: productsTable.active,
    basePrice: productsTable.basePrice,
    createdAt: productsTable.createdAt,
  }).from(productsTable).where(allConditions).orderBy(orderBy).limit(perPage).offset(offset),
  db.select({ count: sql<number>`count(*)` }).from(productsTable).where(allConditions),
])
```

### Sort column maps

Server-side sorting uses `buildOrderBy` with a `SortColumnMap` from `src/lib/sorting.ts`. Define a map of allowed sort columns per feature, then pass it to `buildOrderBy`.

> from `src/features/products/server.ts`
```typescript
const PRODUCT_SORT_COLUMNS = {
  name: productsTable.name,
  createdAt: { expression: productsTable.createdAt, nulls: 'last' },
  basePrice: productsTable.basePrice,
} satisfies SortColumnMap
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

- Dev server: `bun run dev`
- Build: `bun run build`
- Start production: `bun run start:prod`
- Typecheck: `bun run typecheck`
- DB generate migration: `bun run db:generate`
- DB migrate: `bun run db:migrate`
- DB push (dev only): `bun run db:push`
- DB studio: `bun run db:studio`

## Conventions observed

- Server functions live in `src/features/*/server.ts`, model functions in `src/features/*/model.ts`
- Every handler has an explicit return type annotation
- Dynamic imports (`await import(...)`) for server-only modules inside every handler
- `Promise.all()` to parallelize `resolveOrgId()` with model imports
- `MutationResult` (`{ ok: true } | { ok: false; error: string }`) for all mutation returns
- Zod schemas in `src/lib/validation-schemas.ts` for shared validation; inline schemas for feature-specific
- `SortColumnMap` + `buildOrderBy` for all server-side sorting
- `queryKeys` factory from `src/lib/query-keys.ts` for all TanStack Query keys
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

## Gaps / verify

- `src/lib/rls.ts` is referenced in `docs/agents/boilerplate/feature-module.md` as an `orgFilter` helper, but the file does not exist. The codebase uses `eq(table.orgId, orgId)` directly everywhere. Do not create this file — it appears to be a planned abstraction that was never implemented.
- `docs/agents/boilerplate/feature-module.md` shows `orgFilter('org_id')` in the model pattern, but live source never uses it. Follow live source.
- The `resolveOrgId()` helper does not take an org ID parameter — it always resolves the user's first membership. When a user can belong to multiple orgs (planned), this will need a `currentOrgId` parameter.
- The only allowed non-`createServerFn` backend route is `src/routes/api/auth/$.ts` (Better Auth catch-all).
