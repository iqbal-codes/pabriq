# TanStack BaseStack

Opinionated SaaS boilerplate built on [TanStack Start](https://tanstack.com/start) (React 19, Vite, file-based router) with auth, database, i18n, and full component system pre-configured.

## Quick Start

This project uses [Infisical](https://infisical.com) for secret management. No `.env.local` file is required.

### Prerequisites
- [Infisical CLI](https://infisical.com/docs/cli/overview) installed and logged in
- Access to the Infisical project (see `.infisical.json` for project config)

### Run locally

```bash
bun install
bun run dev:infisical   # pulls secrets from Infisical and starts dev server
```

To run without Infisical (e.g. with a manually created `.env.local`):

```bash
bun run dev             # starts dev server using local env
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
| Tests | Vitest + happy-dom + testing-library; Playwright for E2E |

## Commands

```bash
bun install                # install dependencies
bun run dev                # start dev server (port 3001)
bun run dev:infisical      # start dev server with Infisical secrets (local user)
bun run dev:agent          # start dev server with Infisical Machine Identity (for agents)
bun run build              # production build
bun run check              # lint + format (Biome)
bun run typecheck          # TypeScript check
bun run test               # run tests (Vitest)
bun run test:e2e           # run Playwright E2E tests
bun run test:e2e:headed    # run Playwright E2E tests in a visible browser
bun run test:e2e:debug     # run Playwright with CLI debug attach support

# Database
bun run db:generate        # generate drizzle migrations
bun run db:migrate         # apply migrations
bun run db:push            # push schema directly (dev only)
bun run db:studio          # open drizzle studio
bun run db:studio:infisical # open drizzle studio with Infisical secrets (local user)
bun run db:studio:agent    # open drizzle studio with Infisical Machine Identity (for agents)
```

## Git Workflow

### Branch roles

- `develop` — integration branch for day-to-day work. Create `feature/*` and `bugfix/*` branches from `develop`, then merge them back with pull requests.
- `main` — production branch. Only merge `develop` into `main` when the release is ready to ship, or merge a `hotfix/*` branch for urgent production fixes.
- `hotfix/*` — branch from `main`, merge back into `main`, then back-merge into `develop` so the fix stays in the next release.

### Promotion flow

1. Branch from `develop`.
2. Open pull requests into `develop`.
3. Let the `production-build` workflow pass on every PR.
4. When you are ready to release, open a pull request from `develop` into `main`.
5. Deploy from `main`, then tag the production release from `main`.

### GitHub settings to apply

- Create `develop` from the current `main`.
- Recommended: make `develop` the default branch so new pull requests target the integration branch by default.
- Protect both `develop` and `main`: require pull requests, require the `production-build` status check, require conversation resolution, and block force pushes and deletions.
- Turn on auto-delete for head branches after merge.
- If you later add GitHub Actions deployments, restrict the `staging` environment to `develop` and the `production` environment to `main`.

`bun run build` is the first CI gate because the current branch already carries unrelated Biome and TypeScript failures. Once that backlog is cleared, promote `bun run check`, `bun run typecheck`, and `bun run test` into required status checks too.

## Environment

Secrets are managed via **Infisical** — no local `.env` file is required for day-to-day development. The project is linked to Infisical via `.infisical.json`.

If you need to run without Infisical, copy `.env.example` to `.env.local` and fill in the values manually:

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | Neon Postgres connection string |
| `DATABASE_URL_POOLER` | No | Neon pooled connection (serverless) |
| `BETTER_AUTH_SECRET` | Yes | 32+ char secret (`bunx @better-auth/cli@latest secret`) |
| `BETTER_AUTH_URL` | Yes | App URL (default: `http://localhost:3001`) |
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
