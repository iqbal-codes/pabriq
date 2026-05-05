# TanStack BaseStack

Opinionated SaaS boilerplate built on [TanStack Start](https://tanstack.com/start) (React 19, Vite, file-based router) with auth, database, i18n, and full component system pre-configured.

## Quick Start

```bash
bun install
cp .env.example .env.local   # fill in your credentials
bun run dev                   # http://localhost:3000
```

## Stack

| Layer | Technology |
|---|---|
| Framework | TanStack Start + React 19 |
| Router | TanStack Router (file-based) |
| Auth | Better Auth (email/password + orgs) |
| Database | Neon Postgres + Drizzle ORM |
| UI | Tailwind CSS v4 + shadcn/ui (New York) |
| Icons | lucide-react |
| Forms | TanStack Form |
| Data fetching | TanStack Query + server functions |
| Client state | TanStack Store + TanStack DB |
| URL state | nuqs |
| i18n | use-intl (en/id) |
| Monitoring | Sentry |
| Lint/format | Biome |
| Tests | Vitest + happy-dom + testing-library |

## Commands

```bash
bun install          # install dependencies
bun run dev          # start dev server (port 3000)
bun run build        # production build
bun run check        # lint + format (Biome)
bun run typecheck    # TypeScript check
bun run test         # run tests (Vitest)

# Database
bun run db:generate  # generate drizzle migrations
bun run db:migrate   # apply migrations
bun run db:push      # push schema directly (dev only)
bun run db:studio    # open drizzle studio
```

## Environment

Copy `.env.example` to `.env.local`:

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | Neon Postgres connection string |
| `DATABASE_URL_POOLER` | No | Neon pooled connection (serverless) |
| `BETTER_AUTH_SECRET` | Yes | 32+ char secret (`bunx @better-auth/cli@latest secret`) |
| `BETTER_AUTH_URL` | Yes | App URL (default: `http://localhost:3000`) |
| `SENTRY_DSN` | No | Sentry project DSN |

## Project Structure

```
src/
├── components/
│   ├── app/              # Reusable app components
│   │   ├── form/         # Form system (TanStack Form)
│   │   ├── data-table/   # DataTable (TanStack Table)
│   │   ├── page-shell/   # PageHeader, PageContent, Breadcrumbs, EmptyState
│   │   └── asset-upload/ # Upload dropzone, grid, list
│   └── ui/               # 57 shadcn/ui primitives
├── db/                   # Drizzle schema + client + RLS
├── features/<name>/      # model.ts + server.ts + hooks.ts
├── lib/                  # Auth, i18n, query client, R2, RLS, logger
├── messages/             # use-intl translations (en.ts, id.ts)
├── routes/               # File-based routes
├── router.tsx            # Router creation (i18n rewrites)
└── styles.css            # Tailwind v4 + CSS variables
```

## Routes

| Path | Description |
|---|---|
| `/sign-in` | Sign-in form (validated redirect param) |
| `/sign-up` | Sign-up form |
| `/onboarding` | Org creation with logo upload |
| `/_org/` | Protected workspace with sidebar layout |
| `/_org/dashboard` | Dashboard |
| `/api/auth/$` | Better Auth handler |

## Key Patterns

| Pattern | Location |
|---|---|
| Form system | `src/components/app/form/` — `useAppForm`, field components, layout |
| Data table | `src/components/app/data-table/` — filters, pagination, mobile cards |
| Server functions | `src/features/*/server.ts` — `createServerFn` with org resolution |
| Permission guards | `src/features/permissions/model.ts` — `canManageProducts(role)` |
| Query key factory | `src/lib/query-keys.ts` — structured, type-safe keys |
| Application RLS | `src/lib/rls.ts` — `orgFilter('org_id')` |
| URL search params | `useQueryState` from nuqs (NOT `useSearchParams`) |

## See Also

- `docs/boilerplate.md` — **comprehensive reference** for all components, patterns, and architecture
- `AGENTS.md` — behavioral guidelines and project context
- `CONTEXT.md` — domain language and architectural boundaries
- `docs/agents/` — agent skill configuration and rule files
