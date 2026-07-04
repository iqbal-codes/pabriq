# pabriq-app-v2 — Codebase Profile

> Single source of truth for this codebase's stack, architecture, and tooling.
> Domain skills (pabriq-app-v2-ui, pabriq-app-v2-backend, ...) reference this and add specifics.
> Generated 2026-07-04T12:00:00Z; refresh with `codebase-skills sync`.

## Identity
- **Name**: pabriq-app-v2
- **Path**: /Users/efishery/Documents/workspace/projects/pabriq-app-v2
- **Type**: monolith
- **One-line description**: Opinionated SaaS boilerplate built on TanStack Start (React 19, Vite, file-based router) with auth, database, i18n, and full component system pre-configured.

## Stack
- **Languages**: TypeScript (v5.8.3)
- **Frameworks**: TanStack Start (React 19), TanStack Router, TanStack Query, Better Auth (v1.5.3), Drizzle ORM (v0.45.1), Tailwind CSS v4, Mastra (v1.47.0)
- **Runtime**: Node/Vite (dev), Bun (v1.3.10)
- **Package manager**: Bun (v1.3.10)
- **Key dependencies**: `@tanstack/react-start`, `@tanstack/react-router`, `@tanstack/react-query`, `@tanstack/react-form`, `better-auth`, `drizzle-orm`, `tailwindcss`, `@mastra/core`, `nuqs`, `use-intl`

## Architecture
Full-stack meta-framework monolith using TanStack Start. A request maps to file-based routes in `src/routes/`. Pages load components from `src/components/app/` and features under `src/features/`. Data fetching uses TanStack Query + `createServerFn` defined in feature modules (`src/features/<name>/server.ts`). These server functions invoke pure model logic / Drizzle queries in `src/features/<name>/model.ts`. Better Auth handles authentication with organizations/roles. Permissions are checked at both the UI and server levels.

## Folder map
- `src/` — source directory
  - `components/` — UI components (app/ reusable, ui/ shadcn primitives)
  - `db/` — Drizzle client and schema definitions
  - `features/` — Feature modules (model.ts, server.ts, hooks.ts, components/, pages/)
  - `hooks/` — Shared React hooks (e.g. use-mobile.ts)
  - `lib/` — Shared utilities (auth, logger, query-client, R2, etc.)
  - `messages/` — translations for i18n (en.ts, id.ts)
  - `routes/` — File-based routing definitions
  - `types/` — Type definitions
  - `mastra/` — Mastra AI agent framework config, tools, and agents
- `public/` — Static assets and manifest.json
- `e2e/` — Playwright end-to-end tests
- `drizzle/` — Drizzle migration files and snapshots

## Commands
Copied verbatim from package.json scripts / README.md:
- Install: `bun install`
- Dev (Local): `bun run dev` (vite dev --port 3001)
- Dev (Infisical): `bun run dev:infisical` (load-env dev -- bun run dev)
- Dev (Agent): `bun run dev:agent` (infisical-run.sh bun run dev)
- Build: `bun run build` (vite build && cp instrument.server.mjs dist/server)
- Test (all): `bun run test` (load-env-test -- vitest run --passWithNoTests)
- Test (E2E): `bun run test:e2e` (load-env-test -- playwright test)
- Lint/Format check: `bun run check` (biome check .)
- Format write: `bun run format` (biome format --write .)
- Typecheck: `bun run typecheck` (tsc --noEmit)
- DB Studio: `bun run db:studio` (drizzle-kit studio)
- DB Studio (Infisical): `bun run db:studio:infisical` (load-env dev -- bun run db:studio)
- DB Generate Migration: `bun run db:generate` (drizzle-kit generate)
- DB Migrate: `bun run db:migrate` (drizzle-kit migrate)

## Conventions (summary)
The cross-cutting conventions:
- Style/format: Biome linter/formatter (`biome.json`). Indent: 2 spaces. Quotes: single. Semicolons: asNeeded.
- Export style: Named exports.
- Naming: camelCase for variables/functions, PascalCase for components/types/interfaces, kebab-case for filenames generally.
- Import style: Internal imports must use `#/` prefix mapping to `./src/` (configured in package.json `imports`).
- Error handling: Discriminated union return types: `{ ok: true, data: T } | { ok: false, error: string }`.
- Testing: Co-located tests next to the files they test (e.g. `*.test.tsx`, `*.test.ts`).

## Key files
- `package.json` — dependencies, scripts, and import aliases.
- `tsconfig.json` — TypeScript configuration.
- `vite.config.ts` — Vite config with TanStack Start, Serwist, and Tailwind v4 plugins.
- `biome.json` — Biome formatter and linter config.
- `src/db/schema.ts` — Drizzle DB schema definitions.
- `src/db/index.ts` — Drizzle client connection and Pool setup.
- `src/lib/auth.ts` — Better Auth backend initialization and access control roles.
- `src/lib/auth-client.ts` — Better Auth client-side SDK.
- `src/mastra/index.ts` — Mastra AI agent configuration.
- `src/routes/__root.tsx` — Root router layout and provider setup.

## Open questions
- **Missing RLS**: Boilerplate documentation references `src/lib/rls.ts` and `orgFilter` function. However, `rls.ts` does not exist in the codebase. All queries filter by org ID explicitly (`eq(table.orgId, orgId)`).
- **Missing Seeding**: No database seeding commands or files exist in `package.json` or the codebase. Developers must manually populate database values or create them through the application flow.
- **Better Auth COOKIE_DOMAIN**: Fallback domain defaults to `.pabriq.com` or `.localhost`. In dev, the cookie domain resolves to `.localhost` for subdomain organization resolution (e.g., `org.localhost`).
