---
name: pabriq-app-v2-foundation
description: Architectural playbook for the pabriq-app-v2 full-stack codebase. Triggers when working on high-level architecture, creating new feature modules, registering routes, handling global state, or configuring the TanStack Start framework.
---

# pabriq-app-v2 — Foundation

This is the architectural hub for the pabriq-app-v2 manufacturing SaaS. It owns the shared profile and manifest that all domain skills reference. Read the profile first for the raw facts; this skill adds the narrative — how the pieces fit together and what a new contributor needs to internalize.

> Read `../pabriq-app-v2-foundation/references/codebase-profile.md` first for the shared stack, architecture, and tooling context.

## How the codebase is organized

pabriq-app-v2 is a full-stack TanStack Start application — React 19 on the frontend, server functions on the backend, Neon Postgres for data. The key architectural decision is the **feature module pattern**: every business domain lives in `src/features/<name>/` with a consistent three-file structure.

### The feature module pattern

```
src/features/<name>/
├── model.ts      # Pure business logic + Drizzle DB queries
├── server.ts     # createServerFn wrappers (org resolution, validation)
├── hooks.ts      # TanStack Query hooks (useSuspenseQuery, useMutation)
├── components/   # (optional) Feature-specific UI
└── pages/        # (optional) Route-level page components
```

This separation exists for a reason:
- **model.ts** is testable without a server — you can import and call functions directly in tests
- **server.ts** handles the HTTP boundary: session auth, org resolution, input validation
- **hooks.ts** wires server functions to TanStack Query for caching and suspense

### How a request flows end-to-end

1. **Route loader** calls a TanStack Query hook (e.g. `useProductsList`)
2. The hook calls a `createServerFn` function (e.g. `listProductsFn`)
3. The server function dynamically imports `auth` and `db`, resolves the org from the session, validates input
4. The server function calls model functions (e.g. `listProducts(orgId, filters)`)
5. Model functions build Drizzle queries, always filtering by `orgId`
6. Data flows back through the chain: Postgres → Drizzle → server function → Query hook → React component

### Where to add new things

| What | Where |
|---|---|
| New feature module | `src/features/<name>/model.ts` + `server.ts` + `hooks.ts` |
| New route | `src/routes/_org/<name>/` (protected) or `src/routes/<name>.tsx` (public) |
| New API endpoint | `src/routes/api/<name>.ts` (only for webhooks/external APIs) |
| New UI component | `src/components/app/<name>.tsx` (reusable) or feature's `components/` |
| New DB table | Add to `src/db/schema.ts` with `orgId` FK, then `bun run db:generate` |
| New permission | Add to `src/features/permissions/model.ts` |
| New translation key | Add to `src/messages/en.ts` and `src/messages/id.ts` |
| New query key | Add to `src/lib/query-keys.ts` factory |

### The provider stack

The root layout (`src/routes/__root.tsx`) wraps everything in this order:

```
IntlProvider → QueryClientProvider → ThemeProvider → TooltipProvider → NuqsAdapter → Outlet + Toaster
```

TanStack DevTools (Router + Query panels) are added client-only in development.

### Route organization

Routes are file-based under `src/routes/`. The `_org.tsx` layout file guards all org-scoped pages — it checks the session and resolves the org before any child route loads. Public routes (sign-in, sign-up, onboarding, customer portal) live outside `_org/`.

Route context pattern — every org route provides breadcrumbs, title, and actions via `beforeLoad`:

```typescript
export const Route = createFileRoute('/_org/products')({
  beforeLoad: () => ({
    breadcrumb: 'products',
    pageTitle: 'products',
    primaryAction: { label: 'createProduct', href: '/products/new' },
  }),
})
```

## Cross-domain building blocks

Before writing new code, prefer these existing patterns:

| Asset | Use when | Location |
|---|---|---|
| PageShell | Any workspace page | `src/components/app/page-shell/` |
| useAppForm | Any form | `src/components/app/form/` |
| DataTable | Any list/table | `src/components/app/data-table/` |
| createServerFn | Any server op | `src/features/*/server.ts` |
| queryKeys | Query cache keys | `src/lib/query-keys.ts` |
| permission guards | Role checks | `src/features/permissions/model.ts` |
| StatusBadge | Status display | `src/components/status-badge.tsx` |
| ConfirmDialog | Destructive actions | `src/components/confirm-dialog.tsx` |
| validationSchemas | Shared Zod schemas | `src/lib/validation-schemas.ts` |
| resolveOrgContext | Server org resolution | `src/lib/auth-session.ts` |
| serverLoggerMiddleware | Server logging | `src/lib/server-logger-middleware.ts` |

Detailed usage of each is in the domain skills (ui, backend, data). The boilerplate docs at `docs/agents/boilerplate/` are the canonical reference.

## How to run the project

```bash
bun install                # Install
bun run dev                # Dev server (port 3001)
bun run dev:infisical      # Dev with Infisical secrets
bun run build              # Production build
bun run check              # Biome lint + format
bun run typecheck          # TypeScript check
bun run test               # Vitest (staging DB via load-env-test)
bun run test:e2e           # Playwright E2E
bun run start:prod        # Start production server wrapper

**Critical safety**: NEVER run `vitest` directly. Always `bun run test`. The vitest.config.ts has a safety check that aborts if `VITEST_FROM_SCRIPT` is not set — this prevents accidental production DB access.

**Pre-commit pipeline**: `bun run check && bun run typecheck && bun run test`. For route/server/import changes: also `bun run build`.

## Environment & secrets

Secrets managed via Infisical (`.infisical.json`). The `load-env` script pulls secrets for dev; `load-env-test` pulls staging secrets for tests. Agents use `scripts/infisical-run.sh` with Machine Identity credentials.

Key env vars: `DATABASE_URL` (required), `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `SENTRY_DSN` (optional), `R2_*` (optional).

## Gaps / verify

- `orgFilter` from `src/lib/rls.ts` is documented but unused — codebase uses `eq(table.orgId, orgId)` directly.
- Mastra AI assistant features (floating chat panel, order draft proposals, and business overview/search tools) are now wired up.
- Production deployment process beyond Dockerfile not documented in-repo.
