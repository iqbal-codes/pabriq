# Auth Rules

> **Reference:** [`../boilerplate/auth.md`](../boilerplate/auth.md) — code examples, permission table, session/guard patterns.

## Purpose

Controls authentication, organization membership, access control, route guards, and session management.

## When To Read This

- Adding or modifying authentication flows (sign-in, sign-up, onboarding).
- Adding route guards to new workspace routes.
- Adding role-based access checks.
- Debugging session resolution or org context issues.
- Reviewing a PR that touches `src/lib/auth.ts`, `src/lib/auth-session.ts`, or `src/lib/auth-client.ts`.

## Current Project Pattern

**Auth library:** Better Auth v1.5 configured in `src/lib/auth.ts`:
- Drizzle adapter with provider `pg` and schema from `src/db/schema.ts`.
- Email/password authentication enabled.
- Plugins: `tanstackStartCookies()`, `organization()` with built-in access control (`createAccessControl` with `owner`, `admin`, `member` roles).
- Cross-subdomain cookies with prefix `pbq` (`advanced.crossSubDomainCookies`).
- API handler: `src/routes/api/auth/$.ts` exposes both GET and POST to `auth.handler(request)`.

**Client auth:** `src/lib/auth-client.ts` exports `authClient` created via `createAuthClient()` from `better-auth/react`. Used in `src/features/auth/AuthForm.tsx` for `signUp.email()` and `signIn.email()`.

**Session resolution:** `src/lib/auth-session.ts` exports `getCurrentSession` server function. Route guards use this to determine if a session exists before rendering protected routes.

**Route guards:**
- `src/routes/_org.tsx:22-37` — `beforeLoad` checks session and org membership; redirects to `/sign-in` (with `redirect` param) or `/onboarding`.
- `src/routes/onboarding.tsx:23-29` — `beforeLoad` ensures session exists; redirects to `/sign-in` if not.
- `src/routes/sign-in.tsx:21-27` — `beforeLoad` redirects authenticated users to `search.redirect ?? '/onboarding'`.
- `src/routes/sign-up.tsx` — same pattern as sign-in.
- `src/routes/sign-in.tsx:18-20` — `validateSearch` sanitizes the `redirect` param to prevent open redirect attacks.

**Role-based access:** `src/features/permissions/model.ts` exports pure function guards (`canManageMembers`, `canManageProducts`, `canCreateOrders`, `canApproveOrders`, `canManageInvoices`, `canAdvanceProductionTask`, `canViewProduction`). All take a `Role` ('owner' | 'admin' | 'member') and return `boolean`.

**Better Auth access control:** `src/lib/auth.ts:9-65` defines statement permissions per role (`ac.newRole(...)`) and is enforced by Better Auth's organization plugin.

**Organization context:** `src/features/org/server.ts` exports `getActiveOrg` which resolves the user's membership from the session and returns the org and role.

## Non-Negotiable Rules

- MUST use `getCurrentSession` from `#/lib/auth-session` for session checks in route guards.
- MUST use `authClient` from `#/lib/auth-client` for client-side auth operations.
- MUST NOT call `betterAuth` directly in client code — use `authClient` for sign-in/sign-up and server functions for session/org queries.
- MUST sanitize the `redirect` search param in auth routes (see `src/routes/sign-in.tsx:5-15`).
- MUST use permission guards from `src/features/permissions/model.ts` for role-based UI or logic gates.
- MUST resolve org context from the session/membership, not from client input.
- MUST NOT cache or store the session client-side outside of what Better Auth manages.
- Route guards in `_org` layout or any org-scoped route MUST redirect unauthenticated users to `/sign-in` with the current `location.href` as the redirect target.

## Allowed Exceptions

- `src/lib/auth.ts:91` — `console.log` for invitation email placeholder. This is a known temporary placeholder until email delivery is integrated.
- `src/routes/api/auth/$.ts` — raw `auth.handler(request)` is required for the Better Auth API catch-all route.
- The `session` type in `src/routes/__root.tsx:21` uses `Record<string, unknown>` because Better Auth's session shape is dynamic — this is the established router context boundary.

## Implementation Checklist

1. Add `beforeLoad` to any new org-scoped route that redirects to `/sign-in` if no session.
2. Use `getCurrentSession()` in `beforeLoad` for session checks.
3. Sanitize any redirect param with the same pattern as `src/routes/sign-in.tsx:5-15`.
4. Add permission checks using `src/features/permissions/model.ts` for any role-gated UI or server logic.
5. Register new permissions in `src/lib/auth.ts` statement and roles if needed.

## Verification

```
bun run typecheck
bun run test
```

Route guard tests: `src/routes/-route-guards.test.tsx` validates the auth guard patterns.

Manual check: visit a protected route while not authenticated — must redirect to `/sign-in?redirect=...`.

## Common Mistakes To Avoid

- Importing `auth` from `#/lib/auth` in client components — use `authClient` for client-side calls.
- Forgetting to sanitize the `redirect` search param, opening an open-redirect vulnerability.
- Checking `session` directly without using `getCurrentSession()` in `beforeLoad`.
- Hardcoding role strings (`'admin'`) instead of using the `Role` type and permission guards.
- Creating organization context without proper membership verification — always verify membership via the database, not from client-provided org slug.
