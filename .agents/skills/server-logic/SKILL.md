---
name: server-logic
description: Server function patterns, feature module blueprint, and routing — createServerFn, org/session resolution, logger middleware, feature model/server/hooks, route guards, URL params. Use when writing server functions, route loaders, feature modules, or adding routes.
---

# Server Logic

## Non-Negotiables

- MUST use `createServerFn` for all internal API — never raw `fetch`.
- MUST use `.inputValidator()` — type-only pass-through for GET, Zod schema for mutations.
- MUST resolve org from session (membership lookup), never trust client-provided `orgId`.
- MUST use `.handler()` with explicit return type — never inferred `Promise<any>`.
- MUST use `getRequestHeaders()` from `@tanstack/react-start/server` for header access.
- MUST dynamically import `auth` and `db` inside handler — not at module level.
- MUST narrow `db.select()` to specific columns.

## createServerFn Pattern

```typescript
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { z } from 'zod'

const createItemSchema = z.object({
  name: z.string().min(1),
  price: z.number().positive(),
})

export const createItemFn = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => createItemSchema.parse(input))
  .handler(async ({ data }): Promise<Item> => {
    const { auth } = await import('#/lib/auth')
    const headers = getRequestHeaders()
    const session = await auth.api.getSession({ headers })
    if (!session) throw new Error('Unauthenticated')

    const { db } = await import('#/db/index')
    // business logic — org re-verified from session
  })
```

## Org Re-Verification Pattern

Even when caller passes `ctx.org.id` from route context, the server function MUST re-verify:

```typescript
const memberships = await db
  .select({ id: org.id })
  .from(member)
  .innerJoin(organization, eq(member.organizationId, organization.id))
  .where(and(eq(member.userId, session.user.id), eq(organization.id, data.orgId)))
  .limit(1)

if (memberships.length === 0) throw new Error('Not authorized for this org')
```

## Session Resolution

```typescript
import { getCurrentSession } from '#/lib/auth-session'
const session = await getCurrentSession() // { session, user } | null
```

## Server Logger Middleware

```typescript
import { serverLoggerMiddleware } from '#/lib/server-logger-middleware'

export const myFn = createServerFn({ method: 'GET' })
  .middleware([serverLoggerMiddleware])
  .handler(async ({ data }) => { /* auto-logged, errors sent to Sentry */ })
```

## Feature Module Blueprint

```
src/features/<name>/
├── model.ts    # Pure logic + DB queries
├── server.ts   # createServerFn wrappers
├── hooks.ts    # TanStack Query hooks
```

### hooks.ts pattern
```typescript
import { queryKeys } from '#/lib/query-keys'

export function useItemsList(filters: ListFilters) {
  return useSuspenseQuery({
    queryKey: queryKeys.items.list(filters),
    queryFn: () => listItemsFn({ data: filters }),
  })
}

export function useCreateItem() {
  return useMutation({
    mutationFn: (input: CreateInput) => createItemFn({ data: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.items.all }),
  })
}
```

### Query Key Factory (`#/lib/query-keys`)
```typescript
export const queryKeys = {
  products: {
    all: ['products'] as const,
    lists: () => [...queryKeys.products.all, 'list'] as const,
    list: (filters) => [...queryKeys.products.lists(), filters] as const,
    details: () => [...queryKeys.products.all, 'detail'] as const,
    detail: (id) => [...queryKeys.products.details(), id] as const,
  },
  // customers, orders, assets, portal, address — same structure
}
```

## Routing

### Root Layout (`__root.tsx`) Provider Stack
IntlProvider > QueryClientProvider > ThemeProvider > TooltipProvider > NuqsAdapter > Outlet > Toaster > DevTools.

### Org Guard (`_org.tsx beforeLoad`)
```typescript
const session = await getCurrentSession()
if (!session) throw redirect({ to: '/sign-in', search: { redirect: location.href } })

const orgs = await listUserOrgs()
if (!orgs || orgs.length === 0) throw redirect({ to: '/onboarding' })
return { session, org: orgs[0] }
```

### Auth Routes
```typescript
export const Route = createFileRoute('/sign-in')({
  validateSearch: z.object({ redirect: z.string().optional() }),
  beforeLoad: async () => {
    const session = await getCurrentSession()
    if (session) throw redirect({ to: search.redirect ?? '/onboarding' })
  },
})
```

### URL Search Params (nuqs)
```tsx
import { useQueryState, parseAsString, parseAsInteger } from 'nuqs'
const [search, setSearch] = useQueryState('q', parseAsString.withDefault(''))
const [page, setPage] = useQueryState('page', parseAsInteger.withDefault(1))
```

### Route Context for Page Metadata
```typescript
export const Route = createFileRoute('/_org/entity')({
  beforeLoad: () => ({
    breadcrumb: 'entityName',        // key for useTranslations('breadcrumb')
    pageTitle: 'entityName',          // key for mobile header
    primaryAction: { label: 'createEntity', href: '/entity/new' },
    parentBreadcrumbs: [{ label: 'parent', href: '/parent' }],
  }),
})
```

### Route Structure
| Route | File | Description |
|---|---|---|
| `/sign-in`, `/sign-up` | sign-in.tsx | Auth with redirect validation |
| `/onboarding` | onboarding.tsx | Org creation with logo upload |
| `/_org` | _org.tsx | Protected org layout with sidebar |
| `/_org/entity/` | list | Entity list with search params |
| `/_org/entity/new` | create | Entity create form |
| `/_org/entity/$id/` | detail | Entity detail |
| `/_org/entity/$id/edit` | edit | Entity edit form |
| `/api/auth/$` | API handler | Better Auth handler |

## References

When you need deeper detail, read the bundled reference files:

- Server function patterns (org resolution, middleware): [`references/server-functions.md`](references/server-functions.md)
- Feature module blueprint: [`references/feature-module.md`](references/feature-module.md)
- Routing (guards, nuqs, route structure): [`references/routing.md`](references/routing.md)
