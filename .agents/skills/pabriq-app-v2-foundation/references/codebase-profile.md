# pabriq-app-v2 — Codebase Profile

> Single source of truth for this codebase's stack, architecture, and tooling.
> Domain skills (pabriq-app-v2-ui, pabriq-app-v2-backend, ...) reference this and add specifics.
> Generated 2026-07-04; refresh with `codebase-skills sync`.

## Identity
- **Name**: pabriq-app-v2
- **Path**: /Users/efishery/Documents/workspace/projects/pabriq-app-v2
- **Type**: Full-stack monolith (TanStack Start SSR + React SPA)
- **One-line description**: Manufacturing SaaS for garment/textile factories — orders, production, invoices, customer portal.

## Stack
- **Languages**: TypeScript (strict), CSS
- **Frameworks**: TanStack Start (React 19), TanStack Router (file-based), TanStack Query, TanStack Form, TanStack Table
- **Runtime**: Node 20 (production), Bun 1.3.10 (dev + build)
- **Package manager**: Bun (`bun.lock` authoritative)
- **Key dependencies**:
  - **Auth**: Better Auth (email/password + orgs + roles)
  - **Database**: Neon Postgres + Drizzle ORM
  - **UI**: Tailwind CSS v4 + shadcn/ui (New York style) + Radix UI + lucide-react
  - **Forms**: TanStack Form via `useAppForm` wrapper
  - **Data fetch**: TanStack Query + `createServerFn`
  - **URL state**: nuqs (`useQueryState`)
  - **i18n**: use-intl (en + id)
  - **AI**: Mastra (agents + tools in `src/mastra/`)
  - **Payments**: Midtrans integration
  - **Storage**: Cloudflare R2 via `@aws-sdk/client-s3`
  - **PDF**: `@react-pdf/renderer`
  - **Monitoring**: Sentry (`@sentry/tanstackstart-react`)
  - **PWA**: Serwist v9.5 (`serwist` + `@serwist/build` + `@serwist/window`) — installable PWA with precaching
  - **Lint/format**: Biome
  - **Tests**: Vitest + happy-dom + testing-library (unit), Playwright (E2E)

## Architecture

TanStack Start full-stack React app. Server functions (`createServerFn`) handle all data access — no raw `fetch` for internal APIs. Each feature follows a `model.ts` (pure logic + DB queries) → `server.ts` (createServerFn wrappers with org resolution) → `hooks.ts` (TanStack Query hooks) pattern. Auth uses Better Auth with organization plugin; every business table has an `orgId` FK filtered from the session. Routes are file-based under `src/routes/`, with `_org.tsx` guarding authenticated org-scoped pages. UI uses shadcn/ui primitives wrapped by a custom form system and DataTable.

Data flow: Route loader → createServerFn → org resolution from session → Drizzle query → Postgres → typed response → TanStack Query → React components.

## Folder map

```
src/
  components/
    app/              — Reusable app-level components (page-shell, form, data-table, asset-upload)
    ui/               — 57 shadcn/ui primitives (generated, not hand-edited)
    customized/       — Customized UI components
  db/
    index.ts          — Drizzle client (pg Pool)
    schema.ts         — All table definitions (~30 tables)
    connection-string.ts
  features/           — Domain modules (model.ts + server.ts + hooks.ts)
    products/         — Product catalog, pricing breakpoints, addons
    orders/           — Order lifecycle, line items, approvals
    invoices/         — Invoice generation, payments, line items
    customers/        — Customer management
    production/       — Production stages, tasks, kanban, spawner
    members/          — Org member management
    settings/         — Org settings, profiles
    portal/           — Public customer portal (token-based)
    assets/           — File upload to R2
    documents/        — PDF generation (invoices, orders)
    dashboard/        — Dashboard analytics
    pricing/          — Pricing engine (breakpoints, interpolation)
    permissions/      — Role-based permission guards
    auth/             — Auth helpers (org listing, auth form)
    admin/            — Admin operations
    assistant/        — AI assistant (Mastra integration)
    address/          — Address + Biteship area search
  hooks/              — Shared React hooks
  lib/                — Utilities (auth, query-keys, r2, rls, logger, formatters, sorting)
  messages/           — i18n translations (en.ts, id.ts, types.ts)
  routes/             — File-based routes
    _org/             — Protected org layout (dashboard, products, orders, invoices, customers, production, settings)
    api/              — API routes (midtrans notifications, auth, documents)
    operator/         — Operator portal
    sign-in.tsx, sign-up.tsx, onboarding.tsx, invite/
  config/             — App configuration
  types/              — Global type declarations
  integrations/       — Integration configs (tanstack-query)
  sw.ts               — Serwist service worker (precaches shell assets)
  tanstack-serwist-plugin.ts — Vite plugin for SW build + manifest injection
public/
  manifest.json       — PWA web app manifest (name, icons, display mode)
  logo192.png         — PWA icon 192px
  logo512.png         — PWA icon 512px (any + maskable)
  pwa-icon.svg        — PWA icon source SVG
docs/
  PRD.md              — Product requirements document
  specs/              — Feature specifications
  agents/             — Agent rules and boilerplate docs
    boilerplate/      — 15 boilerplate reference docs
    rules/            — 8 rules docs
  plans/              — Implementation plans
  adr/                — Architecture decision records
scripts/
  infisical-run.sh    — Infisical Machine Identity auth script
e2e/                  — Playwright E2E tests
drizzle/              — Migration files (27+ migrations)
.sandcastle/          — Agent sandbox configs (Dockerfile, CODING_STANDARDS.md)
```

## Commands

All from `package.json` scripts. **MUST use `bun run`, never invoke tools directly.**

| Command | Source | Notes |
|---|---|---|
| `bun install` | assumed | Install dependencies |
| `bun run dev` | script `dev` | Dev server on port 3001 (Sentry instrumented) |
| `bun run dev:infisical` | script | Dev with Infisical secrets (local user) |
| `bun run dev:agent` | script | Dev with Infisical Machine Identity (for agents) |
| `bun run build` | script `build` | Vite build + copy instrument.server.mjs |
| `bun run check` | script | Biome lint + format check |
| `bun run typecheck` | script | `tsc --noEmit` |
| `bun run test` | script `test` | Vitest via load-env-test (staging DB) |
| `bun run test:e2e` | script | Playwright E2E tests |
| `bun run db:generate` | script | Generate Drizzle migrations |
| `bun run db:migrate` | script | Apply migrations |
| `bun run db:push` | script | Push schema directly (dev only) |
| `bun run db:studio` | script | Open Drizzle Studio |
| `bun run format` | script | Biome format --write |

**Pre-commit pipeline**: `bun run check && bun run typecheck && bun run test`. For route/server changes: also `bun run build`.

## Conventions (summary)

- **Style**: Biome — single quotes, no semicolons (ASI), 2-space indent
- **Imports**: `#/` prefix for all internal imports; `import type` for type-only bindings (`verbatimModuleSyntax`)
- **Exports**: Named exports preferred; PascalCase components, camelCase functions/variables
- **Error handling**: Discriminated unions `{ ok: true, data: T } | { ok: false, error: string }`
- **Org scoping**: Every business query filtered by `orgId` from session; never trust client-provided orgId
- **Components**: One per file, PascalCase filenames; shadcn/ui primitives never hand-edited
- **Forms**: `useAppForm` wrapper only; never build forms from raw shadcn primitives
- **Tables**: `DataTable` wrapper for all list/table UIs
- **URL state**: `nuqs` (`useQueryState`); never `useSearchParams`
- **i18n**: `useTranslations()` in JSX, `getTranslations()` outside; keys in camelCase
- **Booleans**: `is*`, `has*`, `can*` prefix
- **Full conventions**: `docs/agents/rules/` and `.sandcastle/CODING_STANDARDS.md`

## Boilerplate and reusable pattern index

| Pattern / Component | Use when | Canonical files | Avoid |
|---|---|---|---|
| **PageShell** (PageHeader + PageContent) | Any workspace page | `src/components/app/page-shell/` | Building page layout from scratch |
| **useAppForm** | Any form | `src/components/app/form/` | Raw shadcn Input + Label forms |
| **DataTable** | Any table/list UI | `src/components/app/data-table/` | Raw TanStack Table setup |
| **createServerFn** | Any server operation | `src/features/*/server.ts` | Raw `fetch` or API routes |
| **queryKeys factory** | TanStack Query keys | `src/lib/query-keys.ts` | Inline string arrays |
| **permission guards** | Role-based UI/logic | `src/features/permissions/model.ts` | Inline role checks |
| **StatusBadge** | Status display | `src/components/status-badge.tsx` | Custom status styling |
| **ConfirmDialog** | Destructive action confirmation | `src/components/confirm-dialog.tsx` | window.confirm |
| **withForm** | Reusable field groups | `src/components/app/form/` (see form-system.md) | Duplicating field layouts |
| **serverLoggerMiddleware** | Server function logging | `src/lib/server-logger-middleware.ts` | Manual console.log |
| **orgFilter** | Org-scoped queries | `src/lib/rls.ts` | (currently unused; eq(orgId) is the pattern) |
| **resolveOrgId / resolveOrgContext** | Server-side org resolution | `src/lib/auth-session.ts` | Manual session + membership lookup |
| **validationSchemas** | Shared Zod schemas | `src/lib/validation-schemas.ts` | Inline schema definitions |
| **SortColumnMap** | Server-side sorting | `src/lib/sorting.ts` | Custom sort implementations |

## Key files

- `src/routes/__root.tsx` — Root layout (provider stack: Intl → QueryClient → Theme → Tooltip → Nuqs)
- `src/routes/_org.tsx` — Protected org layout with session guard + sidebar
- `src/router.tsx` — Router creation with i18n rewrites
- `src/db/schema.ts` — All Drizzle table definitions (~30 tables)
- `src/db/index.ts` — Drizzle client instantiation (pg Pool)
- `src/lib/auth.ts` — Better Auth server setup
- `src/lib/auth-client.ts` — Better Auth client
- `src/lib/auth-session.ts` — Session/org resolution helpers
- `src/lib/query-keys.ts` — Query key factory
- `src/lib/rls.ts` — Application-level RLS helpers
- `src/lib/sorting.ts` — Sort column map and encoding
- `src/lib/validation-schemas.ts` — Shared Zod schemas
- `src/lib/server-logger-middleware.ts` — Server function logging + Sentry
- `src/lib/r2.ts` — Cloudflare R2 client
- `src/messages/en.ts` — English translations (~40KB)
- `src/messages/id.ts` — Indonesian translations
- `src/messages/types.ts` — Message type definitions
- `src/test/setup.ts` — Vitest setup (jest-dom + matchMedia mock)
- `src/styles.css` — Tailwind v4 + CSS variables
- `src/features/permissions/model.ts` — Role-based permission guards
- `vitest.config.ts` — Vitest config (happy-dom, safety check)
- `biome.json` — Biome lint/format config
- `tsconfig.json` — TypeScript config (strict, bundler resolution)
- `Dockerfile` — Multi-stage build (bun build → node runtime)
- `src/sw.ts` — Serwist service worker (precaches shell assets)
- `src/tanstack-serwist-plugin.ts` — Vite plugin: builds SW + injects precache manifest
- `public/manifest.json` — PWA web app manifest
- `docs/plans/offline-first-implementation-plan.md` — Phased plan for offline-first (Phase 0 done)
- `playwright.config.ts` — Playwright E2E config
- `.sandcastle/CODING_STANDARDS.md` — Agent coding standards
- `docs/agents/boilerplate/` — 15 boilerplate reference docs
- `docs/agents/rules/` — 8 rules docs

## Open questions

- `orgFilter` from `src/lib/rls.ts` is documented but the codebase uses `eq(table.orgId, orgId)` directly everywhere. Verify whether `orgFilter` should be adopted or deprecated.
- Mastra integration (`src/mastra/`) is relatively new. Agent patterns may evolve.
- The `@/*` alias exists alongside `#/` for shadcn/ui compatibility. Both map to `./src/`. Convention is `#/` for authored code.
- Production deployment details beyond Dockerfile not found in-repo. Verify deploy process.
