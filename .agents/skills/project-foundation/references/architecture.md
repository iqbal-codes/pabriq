# Architecture

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
| Data fetch | TanStack Query + `createServerFn` |
| Client state | TanStack Store + TanStack DB |
| URL state | nuqs |
| i18n | use-intl |
| Lint/format | Biome |
| Tests | Vitest + happy-dom + testing-library |

## Directory Layout

```
src/
├── components/
│   ├── app/              # Reusable app-level components
│   │   ├── data-table/   # DataTable (TanStack Table wrapper)
│   │   ├── form/         # Form system (TanStack Form wrapper)
│   │   ├── page-shell/   # Page layout components
│   │   └── asset-upload/ # Upload components
│   └── ui/               # 57 shadcn/ui primitives
├── db/
│   ├── index.ts          # Drizzle client (pg Pool)
│   ├── schema.ts         # All table definitions
│   └── connection-string.ts
├── features/             # Domain modules
│   └── <name>/
│       ├── model.ts      # Pure logic + DB queries
│       ├── server.ts     # createServerFn wrappers
│       └── hooks.ts      # TanStack Query hooks
├── hooks/                # Shared hooks
├── lib/                  # Utilities (auth, i18n, query, r2, rls, etc.)
├── messages/             # i18n translations (en.ts, id.ts)
├── routes/               # File-based routes
├── router.tsx            # Router creation
├── routeTree.gen.ts      # Auto-generated
├── start.ts              # TanStack Start instance
└── styles.css            # Tailwind v4 + CSS variables
```

## Data Flow

```
Route Loader ──> createServerFn ──> Drizzle query ──> Postgres
                       │
                  [org resolution]
                  [input validation]
                       │
                  Returns typed data
                       │
Route component ──> TanStack Query (useSuspenseQuery)
                       │
                  UI components (DataTable, Forms, etc.)
```

## Import Aliases

| Alias | Maps To |
|---|---|
| `#/` | `./src/` |
| `@/` | `./src/` |

All internal imports MUST use `#/` prefix (e.g. `import { db } from '#/db/index'`).

## Root Config Files

| File | Purpose |
|---|---|
| `package.json` | Scripts, dependencies, `#/*` import alias |
| `tsconfig.json` | strict: true, verbatimModuleSyntax, bundler resolution |
| `vite.config.ts` | tanstackStart, tailwindcss, neon, devtools plugins |
| `biome.json` | Lint/format config (single quotes, excludes ui/ + gen files) |
| `drizzle.config.ts` | PG dialect, schema path, migration output |
| `components.json` | shadcn New York, `#/components` alias, lucide icons |
| `vitest.config.ts` | happy-dom, globals, alias resolution |

## Environment Variables

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | Yes | Neon Postgres connection string |
| `BETTER_AUTH_SECRET` | Yes | `bunx @better-auth/cli@latest secret` |
| `BETTER_AUTH_URL` | Yes | e.g. `http://localhost:3000` |
| `SENTRY_DSN` | No | Optional monitoring |
| `R2_*` | No | Cloudflare R2 storage |

DevTools available in development: TanStack Router panel, TanStack Query panel.
