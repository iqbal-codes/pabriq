---
name: project-foundation
description: Project overview — stack, directory layout, config files, environment variables, import aliases, utility library (cn, logger, R2, subdomain, query client). Use when setting up the project, understanding the codebase structure, configuring tools, or using shared utilities.
---

# Project Foundation

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
| Data fetch | TanStack Query + createServerFn |
| URL state | nuqs |
| i18n | use-intl (en/id) |
| Lint/format | Biome |
| Tests | Vitest + happy-dom + testing-library |

## Directory Layout

```
src/
├── components/
│   ├── app/              # Reusable app components (form, data-table, page-shell, asset-upload)
│   └── ui/               # 57 shadcn/ui primitives
├── db/                   # Drizzle schema + client + RLS
├── features/<name>/      # model.ts + server.ts + hooks.ts
├── lib/                  # Auth, i18n, query client, R2, RLS, logger
├── messages/             # use-intl translations (en.ts, id.ts)
├── routes/               # File-based routes
├── router.tsx            # Router creation (i18n rewrites)
└── styles.css            # Tailwind v4 + CSS variables
```

## Import Aliases

| Alias | Maps To |
|---|---|
| `#/` | `./src/` (all internal imports MUST use this) |
| `@/` | `./src/` (shadcn/ui components) |

## Environment Variables

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | Yes | Neon Postgres connection string |
| `BETTER_AUTH_SECRET` | Yes | `bunx @better-auth/cli@latest secret` |
| `BETTER_AUTH_URL` | Yes | e.g. `http://localhost:3000` |
| `SENTRY_DSN` | No | Optional monitoring |
| `R2_*` | No | Cloudflare R2 storage |

## Configuration Files

| File | Purpose |
|---|---|
| `package.json` | Scripts, dependencies, `#/*` import alias |
| `tsconfig.json` | strict: true, verbatimModuleSyntax, bundler resolution |
| `vite.config.ts` | tanstackStart, tailwindcss, neon, devtools plugins |
| `biome.json` | Lint/format (single quotes, excludes ui/ + gen files) |
| `drizzle.config.ts` | PG dialect, schema path, migration output |
| `components.json` | shadcn New York, `#/components` alias |
| `vitest.config.ts` | happy-dom, globals, alias resolution |

## Utilities

### `cn()` (`#/lib/utils`)
`clsx` + `tailwind-merge` for conditional className merging.

### Logger (`#/lib/logger`)
Pino logger with pino-pretty in development.

### R2/S3 Storage (`#/lib/r2`)
`r2Client`, `uploadToR2(key, body, contentType)`, `generateSignedDownloadUrl(key)`, `generateSignedUploadUrl(key)`, `buildR2Key(orgId, ownerType, ownerId, fileHash)`, `parseR2Key(key)`.

### Subdomain (`#/lib/subdomain`)
`extractSubdomain(host: string): string | null` — multi-tenant subdomain routing.

### Query Client (`#/lib/query-client`)
`getQueryClient()` — SSR-safe singleton QueryClient.

## Commands

```bash
bun install          # Install dependencies
bun run dev          # Start dev server (port 3000)
bun run build        # Production build
bun run check        # Biome lint + format
bun run typecheck    # tsc --noEmit
bun run test         # Vitest
bun run db:generate  # Generate Drizzle migrations
bun run db:migrate   # Apply migrations
bun run db:push      # Push schema (dev only)
bun run db:studio    # Open Drizzle Studio
```

## References

When you need deeper detail, read the bundled reference files:

- Architecture (stack, directory layout, config): [`references/architecture.md`](references/architecture.md)
- Utilities (cn, logger, R2, subdomain): [`references/utilities.md`](references/utilities.md)
