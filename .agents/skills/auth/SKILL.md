---
name: auth
description: Authentication system — Better Auth setup, client/server patterns, session resolution, permission guards, route guards. Use when implementing sign-in/sign-up, adding route guards, checking permissions, managing org membership, or reviewing auth flows.
---

# Auth

## Non-Negotiables

- MUST use `getCurrentSession` from `#/lib/auth-session` for session checks in route guards.
- MUST use `authClient` from `#/lib/auth-client` for client-side auth (sign-in/sign-up/sign-out).
- MUST NOT call `betterAuth` directly in client code — use `authClient`.
- MUST sanitize `redirect` search param in auth routes (prevent open redirect).
- MUST use permission guards from `#/features/permissions/model` for role-based UI/logic gates.
- MUST resolve org context from session/membership, not from client input.
- MUST NOT cache or store session client-side outside Better Auth's management.

## Server-Side (`#/lib/auth.ts`)

Better Auth configured with:
- Drizzle adapter (Postgres), email/password
- `tanstackStartCookies()` + `organization()` plugins
- Access control: `owner` (all), `admin` (all minus delete org), `member` (limited)
- Cross-subdomain cookies with `pbq` prefix

## Client-Side (`#/lib/auth-client.ts`)

```typescript
import { authClient } from '#/lib/auth-client'

const { data } = await authClient.signIn.email({ email, password })
const { data } = await authClient.signUp.email({ email, password, name })
const { error } = await authClient.signOut()
```

## Session Check

```typescript
import { getCurrentSession } from '#/lib/auth-session'
const session = await getCurrentSession()
// Returns { session: {...}, user: { id, name, email, image } } | null
```

## Permission Guards (`#/features/permissions/model`)

| Guard | owner | admin | member |
|---|---|---|---|
| `canManageMembers(role)` | ✓ | | |
| `canManageProducts(role)` | ✓ | ✓ | |
| `canCreateOrders(role)` | ✓ | ✓ | ✓ |
| `canApproveOrders(role)` | ✓ | ✓ | |
| `canManageInvoices(role)` | ✓ | ✓ | |
| `canManageCustomers(role)` | ✓ | ✓ | |
| `canViewProduction(role)` | ✓ | ✓ | |
| `canAdvanceProductionTask(role)` | ✓ | ✓ | |
| `canManageStages(role)` | ✓ | ✓ | |

Usage:
```typescript
import { canManageProducts } from '#/features/permissions/model'
if (canManageProducts(org.role)) { /* show admin controls */ }
```

## Route Guard Patterns

### Org Layout Guard (`_org.tsx beforeLoad`)
```typescript
const session = await getCurrentSession()
if (!session) throw redirect({ to: '/sign-in', search: { redirect: location.href } })

const orgs = await listUserOrgs()
if (!orgs || orgs.length === 0) throw redirect({ to: '/onboarding' })
return { session, org: orgs[0] }
```

### Auth Routes (redirect authenticated users away)
```typescript
export const Route = createFileRoute('/sign-in')({
  validateSearch: z.object({ redirect: z.string().optional() }),
  beforeLoad: async ({ search }) => {
    const session = await getCurrentSession()
    if (session) throw redirect({ to: search.redirect ?? '/onboarding' })
  },
})
```

## Org Resolution in Server Functions

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

## References

When you need deeper detail: [`references/auth.md`](references/auth.md) — permissions table, session/guard patterns.
