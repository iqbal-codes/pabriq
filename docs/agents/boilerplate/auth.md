# Auth

> **Rules:** [`../rules/auth.md`](../rules/auth.md) — non-negotiables, checklists, common mistakes.

## Server-Side (`src/lib/auth.ts`)

Better Auth with:
- Drizzle adapter (Postgres)
- Email/password authentication
- `tanstackStartCookies()` plugin
- `organization()` plugin with `createAccessControl`
- Roles: `owner` (full), `admin` (full minus delete org), `member` (limited)

## Client-Side (`src/lib/auth-client.ts`)

```typescript
import { authClient } from '#/lib/auth-client'

const { data } = await authClient.signIn.email({ email, password })
const { data } = await authClient.signUp.email({ email, password, name })
await authClient.signOut()
```

## Session Check (`src/lib/auth-session.ts`)

```typescript
import { getCurrentSession } from '#/lib/auth-session'
const session = await getCurrentSession()
// Returns { session: {...}, user: { id, name, email, image } } | null
```

## Permission Guards (`src/features/permissions/model.ts`)

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

## Route Guard Pattern

```typescript
// _org.tsx beforeLoad
const session = await getCurrentSession()
if (!session) throw redirect({ to: '/sign-in', search: { redirect: location.href } })

const orgs = await listUserOrgs()
if (!orgs || orgs.length === 0) throw redirect({ to: '/onboarding' })
return { session, org: orgs[0] }
```

## Key Rules

- Use `getCurrentSession` for route guards
- Use `authClient` for client-side operations
- Sanitize `redirect` search params in auth routes (prevent open redirect)
- Use permission guards for role-based UI gating
- Resolve org from session, never client input
