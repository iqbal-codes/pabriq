---
name: pabriq-data-features
description: Data-feature adds or changes schema, models, server functions, hooks, queries, mutations, tenant scoping, transactions, cache invalidation, soft deletion, and migrations. Use when adding a new domain table, changing columns, creating model CRUD functions, wiring createServerFn endpoints, building React Query hooks, defining query keys, applying tenant scoping, composing transactions, invalidating cache after mutations, soft-deleting rows, or running drizzle-kit migrations.
---

# Pabriq Data Features

## Scope

Use this skill for schema and migrations, domain models, server functions, query hooks, query keys, tenant scoping, transactions, cache invalidation, and soft deletion. Keep workflow transitions, UI composition, routing, and provider protocols in their owning skills.

## How to

1. Follow the pipeline in order: schema, model, server boundary, hooks, query keys, and invalidation.
2. Read the closest complete feature before editing. Start with `src/features/customers/` or `src/features/products/`, then trace shared behavior in `src/db/` and `src/lib/`.
3. Keep tenant identity server-resolved and pass it explicitly into tenant-scoped model operations. Follow the portal implementation only for portal-owned access.
4. Put coupled writes inside the transaction boundary used by the nearest existing feature. Preserve soft deletion only where the schema and model already implement it.
5. Change migrations through the repository's Drizzle configuration and compare generated artifacts with `src/db/schema.ts`.

## Source pointers

- Schema and database client: `src/db/schema.ts`, `src/db/index.ts`, and `drizzle.config.ts`.
- Domain examples: `src/features/customers/model.ts`, `server.ts`, `hooks.ts`, and the corresponding files under `src/features/products/`.
- Tenant resolution: `src/lib/auth-session-server.ts` and `src/features/portal/server.ts`.
- Sorting and results: `src/lib/sorting.ts` and `src/lib/server-results.ts`.
- Query identity and cache updates: `src/lib/query-keys.ts` and `src/lib/mutation-invalidation.ts`.
- Transaction examples: `src/features/orders/model.ts` and `src/features/production/spawner.ts`.

## Guardrails

- Validate external mutation input at the server boundary before persistence.
- Scope every tenant query from server-resolved identity; never trust a client-supplied organization ID.
- Keep query-key and invalidation changes together with the hook or mutation that uses them.
- Do not introduce a second migration, relation, or data-access convention beside the existing one.

## Verification

Run the narrowest relevant project command: `bun run typecheck`, the affected feature test through `bun run test -- <path>`, and the repository migration command when the schema changes.

<!-- CODEBASE-SKILL-FORGE:HUMAN:START -->
<!-- Add intentional project policy here. Sync preserves this region byte-for-byte. -->
<!-- CODEBASE-SKILL-FORGE:HUMAN:END -->
