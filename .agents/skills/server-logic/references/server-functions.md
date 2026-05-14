# Server Functions

> **Rules:** [`../rules/server-functions.md`](../rules/server-functions.md) — non-negotiables, checklists, common mistakes.

## Standard Pattern

```typescript
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'

export const myFn = createServerFn({ method: 'GET' })
  .inputValidator((input: InputType) => input)
  .handler(async ({ data }): Promise<ReturnType> => {
    const { auth } = await import('#/lib/auth')
    const headers = getRequestHeaders()
    const session = await auth.api.getSession({ headers })
    if (!session) return { ok: false, error: 'Not authenticated' }

    const { db } = await import('#/db/index')
    // business logic
  })
```

## Key Rules

- Dynamically import `auth` and `db` inside the handler (avoids bundling server code client-side)
- Always use `getRequestHeaders()` for header access
- Resolve org from session, never trust client-provided `orgId`
- Always use `.inputValidator()` for client input validation
- Always return an explicit return type from `.handler()`
- Always narrow `db.select()` to specific columns — prevents over-fetching
- NEVER use `LIKE '%term%'` without a `pg_trgm` GIN index

## Org Re-Verification Pattern

Server functions MUST re-verify org membership from the session, even when the caller already resolved it:

```typescript
export const listItemsFn = createServerFn({ method: 'GET' })
  .inputValidator((data: { orgId: string; search?: string }) => data)
  .handler(async ({ data }): Promise<Item[]> => {
    const { auth } = await import('#/lib/auth')
    const headers = getRequestHeaders()
    const session = await auth.api.getSession({ headers })

    const { db } = await import('#/db/index')
    // Re-verify org membership from session, don't trust data.orgId
    const memberships = await db
      .select({ id: org.id })
      .from(member)
      .innerJoin(organization, eq(member.organizationId, organization.id))
      .where(and(eq(member.userId, session.user.id), eq(organization.id, data.orgId)))
      .limit(1)

    if (memberships.length === 0) throw new Error('Not authorized for this org')

    // Now safe to use data.orgId since session confirmed membership
    return listItems(data.orgId, data.search)
  })
```

## Runtime Validation with Zod

Use Zod schemas inside `.inputValidator()` for mutation endpoints:

```typescript
import { z } from 'zod'

const createItemSchema = z.object({
  name: z.string().min(1),
  price: z.number().positive(),
})

export const createItemFn = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => createItemSchema.parse(input))
  .handler(async ({ data }): Promise<Item> => { ... })
```

## Column Narrowing

Always select only the columns you need:

```typescript
// ❌ Fetches ALL columns
const items = await db.select().from(table)

// ✅ Fetches only what's needed
const items = await db
  .select({ id: table.id, name: table.name, status: table.status })
  .from(table)
```

## Session Resolution

```typescript
import { getCurrentSession } from '#/lib/auth-session'
const session = await getCurrentSession()  // returns session object or null
```

## Org Resolution

```typescript
export const getActiveOrg = createServerFn({ method: 'GET' }).handler(
  async (): Promise<ActiveOrg | null> => {
    const { auth } = await import('#/lib/auth')
    const headers = getRequestHeaders()
    const session = await auth.api.getSession({ headers })
    if (!session) return null

    const { db } = await import('#/db/index')
    const memberships = await db
      .select({ id: org.id, name: org.name, slug: org.slug, role: member.role })
      .from(member)
      .innerJoin(organization, eq(member.organizationId, organization.id))
      .where(eq(member.userId, session.user.id))
      .limit(1)

    if (memberships.length === 0) return null
    return memberships[0] as ActiveOrg
  },
)
```

## Server Logger Middleware

```typescript
import { serverLoggerMiddleware } from '#/lib/server-logger-middleware'

export const myFn = createServerFn({ method: 'GET' })
  .middleware([serverLoggerMiddleware])
  .handler(async ({ data }) => { ... })
```

Automatically logs duration and errors, sends errors to Sentry.

## Calling from Components/Loaders

```typescript
const result = await listCustomersFn({ data: { orgId: ctx.org.id, search: 'foo' } })
```

## Rules

- MUST use `createServerFn` — never raw `fetch` for internal API calls
- MUST use `.inputValidator()` — never trust raw client input
- MUST resolve org from session, not from client-provided `orgId`
- MUST use `.handler()` with explicit return type
