---
name: pabriq-routing-auth
description: >
  Route creation, auth guards, role gating, portal tokens, and raw API endpoints in TanStack Start file-based routing.
  Use when adding a page under /_org/, /operator/, or /api/, gating a route by role with can* predicates,
  creating a token-gated portal endpoint, wiring a createServerFn with auth, or modifying session resolution
  and subdomain rewrites.
---

# Pabriq Routing & Auth

## Scope & Ownership

This skill governs adding or changing routes, auth guards, role gating, portal-token endpoints, raw API handlers, server-function wiring, and subdomain rewrites in TanStack Start file-based routing.

**Non-goals** (do not use this skill for):
- Feature CRUD, schema, query, or mutation patterns — use the data-features skill.
- UI composition, page layout, or component design — use the UI recipe skill.
- Generic agent workflow rules — use AGENTS.md.

**Ownership boundaries:**
| Concern | Owner | Boundary |
|---------|-------|----------|
| Session resolution (browser+server) | `src/lib/auth-session.ts` | Server fn + lib |
| Org context resolution | `src/lib/auth-session.ts` | Server fn + lib |
| Server-only org ID lookup | `src/lib/auth-session-server.ts` | Server-only |
| Role predicates (`can*`) | `src/features/permissions/model.ts` | Isomorphic |
| Better Auth config & access control | `src/lib/auth.ts` | Server-only |
| Auth client | `src/lib/auth-client.ts` | Client-only |
| Domain rewrite (subdomain routing) | `src/lib/domain-routing.ts` | Isomorphic |
| Server function middleware | `src/lib/server-logger-middleware.ts` | Server-only |
| Router factory | `src/router.tsx` | Isomorphic |
| Router context provider | `src/integrations/tanstack-query/root-provider.tsx` | Isomorphic |
| Document PDF auth (API) | `src/features/documents/server.tsx` | Server-only |

## Step 1 — Classify the route's auth tier

Determine which tier the new or changed route belongs to. Every route in the app fits exactly one tier. Classification determines the entire construction pattern: the file location, the `beforeLoad` hook, the auth call, and the redirect contract.

| Tier | File location | Auth mechanism | Canonical example |
|------|--------------|----------------|-------------------|
| **Public** | `src/routes/sign-in.tsx`, `src/routes/forbidden.tsx`, `src/routes/order.$token.tsx` | None or token-based | `src/routes/order.$token.tsx` |
| **Org-guarded** (owner/admin) | `src/routes/_org.tsx` + children | `resolveOrgContext()` in layout `beforeLoad` | `src/routes/_org/orders/index.tsx` |
| **Operator-guarded** (member) | `src/routes/operator.tsx` + children | `resolveOrgContext()` in layout `beforeLoad` | `src/routes/operator.tsx` |
| **Role-gated page** | Under `_org/` with `can*()` check | Layout auth + predicate in child `beforeLoad` | `src/routes/_org/settings/production-stages.tsx` |
| **Raw API** | `src/routes/api/**` | `server.handlers` with chosen strategy | `src/routes/api/healthz.ts`, `src/routes/api/documents/invoices/$id/pdf.ts` |
| **Server function** | `src/features/**/server.ts` or `src/lib/**` | `createServerFn` or plain async | `src/lib/auth-session.ts` |
| **Portal token** | `src/routes/order.$token.tsx` or `src/routes/api/**/portal/**` | URL token, no session | `src/routes/order.$token.tsx` |

**Completion criterion:** The route's tier is unambiguously identified and the correct file location and auth mechanism are known.

## Step 2 — Follow the construction pattern for the tier

### 2a. Public page route

Create a file route with `createFileRoute`. No auth in `beforeLoad` unless it is for redirect logic.

```ts
// src/routes/forbidden.tsx — canonical minimal public route
export const Route = createFileRoute('/forbidden')({
  beforeLoad: () => ({ pageTitle: 'accessDenied' as const }),
  component: ForbiddenPage,
})
```

**Rules (Required):**
- Every page route's `beforeLoad` MUST return `{ pageTitle: BreadcrumbKey }` where `BreadcrumbKey = keyof Messages['breadcrumb']`. Verified by `getPageTitleKey()` in `src/routes/__root.tsx:34-44` which walks matches bottom-up.
- If the page appears in the breadcrumb trail, also return `{ breadcrumb: BreadcrumbKey, parentBreadcrumbs?: [...] }`. Consumed by `<Breadcrumbs />`.

**Rules (Observed):**
- `validateSearch` is used for URL search state: Zod schema (`src/routes/_org/orders/index.tsx`) or manual parse (`src/routes/sign-in.tsx:5-14`).
- `sign-up.tsx` always redirects to `sign-in` — the flow is disabled; do not re-enable without explicit approval.

**Completion criterion:** File exists with `createFileRoute`, returns `pageTitle`, renders correct component.

### 2b. Org-guarded page route (owner/admin)

The `_org` layout (`src/routes/_org.tsx`) runs `resolveOrgContext()` in its `beforeLoad` and rejects unauthenticated users (→ `/sign-in?redirect=`), users with no org (→ `/onboarding`), and members (→ ForbiddenPage with link to `/operator`). Child routes inherit this guard automatically.

Child route pattern:

```ts
// src/routes/_org/orders/index.tsx — canonical org child
export const Route = createFileRoute('/_org/orders/')({
  validateSearch: (search) => globalOverlaySearchSchema.parse(search),
  beforeLoad: () => ({
    breadcrumb: 'orders',
    pageTitle: 'orders',
  }),
  component: OrdersListPage,
})
```

**Rules (Required):**
- Child routes MUST return `{ breadcrumb, pageTitle }` from `beforeLoad`. They MUST NOT duplicate the auth guard — the layout `_org.tsx` owns it.

**Rules (Observed):**
- To access the session/org context in a child component, use `Route.useRouteContext()` and cast to `{ session, org, role }`. The cast is necessary because the layout uses `as unknown as` — this is an observed pattern, not ideal.

**Completion criterion:** Child route exists under `_org/`, returns breadcrumb/pageTitle, does not duplicate auth.

### 2c. Operator-guarded page route (member)

The `operator` layout (`src/routes/operator.tsx`) runs `resolveOrgContext()` and produces a discriminated union `OperatorCtx` with three states: `'no-org'`, `'forbidden'`, `'allowed'`. The component renders `<OperatorEmptyOrg />`, `<ForbiddenPage />`, or the operator UI based on the `access` discriminator.

**Rules (Observed):**
- `operator.tsx` hardcodes `role === 'member'` check in the `beforeLoad` instead of using a `can*` predicate. This is a known inconsistency — role-gating belongs in `src/features/permissions/model.ts` but operator.tsx does not use it. Preserve this pattern for operator routes; do not mix in `can*` predicates for member-only access.

**Completion criterion:** Child route under `/operator` works with the discriminated `OperatorCtx`.

### 2d. Role-gated page route

For pages under `_org` that restrict access further than the owner/admin layout (e.g., only owner, or only owner+admin but not member at a finer granularity), add a `can*()` check in the child's `beforeLoad`.

Canonical pattern:

```ts
// src/routes/_org/settings/production-stages.tsx
beforeLoad: ({ context }) => {
  const role = ((context.org as Record<string, unknown>).role ?? 'member') as Role
  if (!canManageStages(role)) {
    throw redirect({ to: '/' })
  }
  return { breadcrumb: 'productionStages', pageTitle: 'productionStages' }
}
```

**Rules (Required):**
- Role predicates MUST come from `src/features/permissions/model.ts`. There are 13 `can*` functions. Use the matching one; do not inline role comparisons in route files.
- Unauthorized access MUST redirect to `/` (dashboard), not render ForbiddenPage. This matches the pattern at `src/routes/_org/settings/production-stages.tsx:19`.
- The `role` is extracted from `context.org` (set by the parent `_org` layout's `resolveOrgContext`). The cast chain `context.org.role` → `Role` is observed; reproduce it as-is.

**Completion criterion:** Child route checks role via a `can*` predicate, redirects unauthorized to `/`, does not bypass layout auth.

### 2e. Raw API route

Place under `src/routes/api/`. Use `server: { handlers: { GET/POST: ... } }` returning raw `Response` objects.

Three auth strategies exist (Observed):

| Strategy | Auth call | Use case | Canonical file |
|----------|----------|----------|----------------|
| **Passthrough** | `auth.handler(request)` | Better Auth catch-all | `src/routes/api/auth/$.ts` |
| **Session-based** | `resolveOrgForDocument(headers)` | Document PDFs | `src/routes/api/documents/invoices/$id/pdf.ts` |
| **Token-based** | URL token lookup, no session | Public portal PDFs | `src/routes/api/documents/invoices/portal/$invoiceId/$token.ts` |
| **None** | No auth | Health probes | `src/routes/api/healthz.ts` |
| **Signature** | HMAC verification | Payment webhooks | `src/routes/api/midtrans-notification.ts` |

**Rules (Required):**
- API handlers MUST return `new Response()` directly. Do not throw for expected business errors — catch and map to status codes.
- Session-based auth MUST use `getRequestHeaders()` from `@tanstack/react-start/server` to forward the request headers.

**Rules (Recommendation):**
- Error discrimination in API handlers currently uses `.message` string comparison (e.g., `if (message === 'Unauthorized')` at `src/routes/api/documents/invoices/$id/pdf.ts:19`). This is fragile — a renamed message silently falls through to 500. Consider using the `DocumentAuthError.statusCode` property for discrimination instead of string matching. `DocumentAuthError` is defined at `src/features/documents/server.tsx:16-24`.

**Completion criterion:** API route file exists, returns `Response` with correct status codes, auth strategy matches the chosen pattern.

### 2f. Server function

Use `createServerFn` with dynamic imports for auth and database modules.

Canonical pattern:

```ts
// src/lib/auth-session.ts — getCurrentSession
export const getCurrentSession = createServerFn({ method: 'GET' }).handler(
  async () => {
    const [{ getRequestHeaders }, { auth }] = await Promise.all([
      import('@tanstack/react-start/server'),
      import('#/lib/auth'),
    ])
    return auth.api.getSession({ headers: getRequestHeaders() })
  },
)
```

**Rules (Required):**
- All `createServerFn` calls are automatically wrapped by `serverLoggerMiddleware` via `src/start.ts:6` `functionMiddleware`. Do not add logging middleware per-function.

**Rules (Observed):**
- Auth and database imports are dynamic (`await import(...)`) in `getCurrentSession` at `src/lib/auth-session.ts:44-47` for code splitting. Data model server functions may use static imports — follow the pattern of the closest existing function.
- For server-only contexts (no client boundary crossing), use plain `async function` with dynamic imports instead of `createServerFn`. Example: `resolveOrgId()` at `src/lib/auth-session-server.ts:1-22`.

**Completion criterion:** Server function uses `createServerFn` with the correct method, is wrapped by global middleware, and follows the import style of nearby server functions.

### 2g. Portal-token route

Public routes accessible via opaque URL tokens. No session auth.

Two patterns exist (Observed):
1. **Page route:** `src/routes/order.$token.tsx` — `createFileRoute('/order/$token')` with no auth, delegates to a feature page.
2. **API route:** `src/routes/api/documents/invoices/portal/$invoiceId/$token.ts` — token lookup in the handler.

**Rules (Observed):**
- Portal URLs use subdomain rewriting: `portal.pabriq.com/X` rewrites to `/order/X` via `rewriteAppUrlInput` at `src/lib/domain-routing.ts:59-61`.
- Use `buildPortalUrl(token, origin)` at `src/lib/domain-routing.ts:81-89` to construct portal-subdomain URLs.
- Portal routes MUST be in the bypass list at `src/lib/domain-routing.ts:32-42` — currently only `/sign-in`, `/sign-up`, `/onboarding`, `/forbidden`, `/invite`, `/api`, and paths with dots bypass rewriting. If the portal route path does not start with `/order`, add it to `shouldBypassSubdomainRewrite`.

**Completion criterion:** Portal route is accessible via token URL, works with subdomain rewrite, no session auth required.

## Step 3 — Wire metadata and search state

Every page route MUST declare its position in the navigation hierarchy.

**Rules (Required):**
- Return `{ pageTitle: BreadcrumbKey }` from `beforeLoad`. `PageTitleSetter` in `src/routes/__root.tsx:46-60` uses this to set `document.title` as `"App - Page"`.
- Return `{ breadcrumb: BreadcrumbKey }` if the page appears in breadcrumbs. Optionally include `parentBreadcrumbs` for deep routes.
- `BreadcrumbKey` values are defined in `src/messages/` locale files under the `breadcrumb` key.

**Rules (Observed):**
- Overlay-driven search params use `globalOverlaySearchSchema` from `src/hooks/use-global-overlay.ts` (Zod + nuqs). Pass via `validateSearch`.
- The router preloads on intent (`defaultPreload: 'intent'` at `src/router.tsx:19`) with zero stale time — no manual `loader`/`queryFn` preloading in route files.

**Completion criterion:** Route has `pageTitle`, breadcrumb metadata if applicable, and any search params are validated with Zod or a typed parser.

## Step 4 — Add role predicates (if role-gating a new action)

If the new route or feature introduces a new permission check not covered by existing `can*` functions:

**Rules (Required):**
- Add the new predicate to `src/features/permissions/model.ts` alongside the existing 13 functions.
- The function MUST take `Role` and return `boolean`. Follow the exact signature pattern: `canManageX(role: Role): boolean`.
- Update the Better Auth access control declaration in `src/lib/auth.ts` (`createAccessControl(statement)`) if the new permission maps to a new resource-action pair.

**Completion predicate:** New `can*` function exists in `model.ts`, is used in the route's `beforeLoad`, and is consistent with the access control statement in `auth.ts`.

## Step 5 — Verify

Run focused verification for every routing or auth change.

**Required checks:**
- `bun run typecheck` — route type safety (TanStack router generates `routeTree.gen.ts`).
- `bun run test -- src/routes/-route-guards.test.tsx` covers route guard scenarios: unauthenticated → `/sign-in`, no-org → `/onboarding`, member → `/operator`, owner/admin → `/`, role mismatch → ForbiddenPage, sign-up → `/sign-in`.
- For subdomain changes: `bun run test -- src/lib/domain-routing.test.ts` covers rewrite roundtrip, bypass paths, port preservation.
- For page titles: `bun run test -- src/routes/-title-dynamic.test.tsx` covers title derivation from `pageTitle` context.

**Completion criterion:** `typecheck` passes, route guard tests pass, new route is reachable from the correct tier, metadata renders correctly.

## Observed Risks

These are preserved inconsistencies from the codebase — do not promote them to target patterns.

1. **Single-org hardcoding:** `resolveOrgContext()` at `src/lib/auth-session.ts:67` always returns `orgs[0]`. Multi-org switching is a TODO.
2. **Role check duplication:** `operator.tsx` hardcodes `role === 'member'` in `beforeLoad`; `_org.tsx` hardcodes `ctx.role === 'member'` in the component. Neither uses `can*` predicates for layout-level gating. This is the current pattern — do not change it without explicit approval.
3. **Type-unsafe context casts:** Both `_org.tsx:71` and `operator.tsx:76` use `as unknown as` for route context. Reproduce this pattern; the underlying TanStack router context typing does not support discriminated unions without casts.
4. **Settings layout has no `beforeLoad`:** `src/routes/_org/settings/route.tsx` inherits auth from `_org.tsx` but individual settings pages (e.g., production-stages) add their own role checks. This is intentional — the settings tab layout is a pass-through shell.
5. **API auth inconsistency:** Document PDF endpoints use `resolveOrgForDocument` (session-based), portal endpoints use token-based, health probes use none, webhooks use signature verification. No single auth strategy applies to all API routes.
6. **Document auth error discrimination by message string:** `src/routes/api/documents/invoices/$id/pdf.ts:19` catches errors and compares `.message` strings. A renamed error message silently falls through to 500.

## Domain Routing

Subdomain routing is wired at the router level in `src/router.tsx:14-17` via `rewrite: { input, output }`.

**Rules (Observed):**
- `operator.*` subdomain rewrites to `/operator/*` prefix.
- `portal.*` subdomain rewrites to `/order/*` prefix.
- Bypass paths: `/sign-in`, `/sign-up`, `/onboarding`, `/forbidden`, `/invite`, `/api`, and paths containing a dot (file extensions). Defined at `src/lib/domain-routing.ts:32-42`.
- To add a new subdomain: extend `APP_SUBDOMAINS` array, add rewrite rules in `rewriteAppUrlInput`/`rewriteAppUrlOutput`, and add bypass if needed.

**Completion criterion:** Subdomain URL resolves to correct internal path, output rewrite produces the external subdomain URL, bypass list covers paths that should not be rewritten.

<!-- CODEBASE-SKILL-FORGE:HUMAN:START -->
<!-- Add intentional project policy here. Sync preserves this region byte-for-byte. -->
<!-- CODEBASE-SKILL-FORGE:HUMAN:END -->
