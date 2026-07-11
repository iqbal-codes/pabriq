---
name: pabriq-data-features
description: Data-feature adds or changes schema, models, server functions, hooks, queries, mutations, tenant scoping, transactions, cache invalidation, soft deletion, and migrations. Use when adding a new domain table, changing columns, creating model CRUD functions, wiring createServerFn endpoints, building React Query hooks, defining query keys, applying tenant scoping, composing transactions, invalidating cache after mutations, soft-deleting rows, or running drizzle-kit migrations.
---

# Pabriq Data Features

Scope: the full pipeline from schema table through model domain logic, server functions, React Query hooks, query keys, tenant scoping, transactions, cache invalidation, soft deletion, and drizzle-kit migrations. Ownership boundary — this skill governs `src/db/schema.ts`, `src/db/index.ts`, `src/lib/server-results.ts`, `src/lib/query-keys.ts`, `src/lib/mutation-invalidation.ts`, `src/lib/sorting.ts`, `src/lib/auth-session-server.ts`, `drizzle.config.ts`, and `src/features/*/model.ts`, `src/features/*/server.ts`, `src/features/*/hooks.ts`. Non-goals: business state-machine transitions beyond CRUD, UI composition, layout, routing, and authorization role definitions.

---

## Schema → Model → Server → Hook Sequence

Every data feature follows this sequence. Each step names what to do, what file lives it, and when it is done.

### Step 1 — Schema table or column change

Read [`references/schema-migrations.md`](references/schema-migrations.md) before touching `src/db/schema.ts` or creating a migration. That reference covers the required pgTable conventions, the org-scoping invariant, drizzle-kit migration workflow, and the verified command sequence.

Completion criterion: the schema file contains the new or changed `pgTable` export; every org-scoped table has an `orgId` text column with `references(() => organization.id, { onDelete: 'cascade' })`; and a drizzle-kit migration SQL file exists under `drizzle/` with a matching journal entry if the schema changed.

### Step 2 — Model domain logic

Create or edit `src/features/<domain>/model.ts`. The model exports:

1. **TypeScript types** for domain objects (full row shape, list-row shape, input shape, list params, list result).
2. **CRUD functions** — `listX`, `getX`, `createX`, `updateX`, `deleteX` — each accepting `orgId` as a parameter (never reading it from session).
3. **Validation functions** when needed — return an error string or `null`, throw `new Error(errorString)` before persisting.
4. **Utility functions** for domain-specific computation.

Patterns (all Observed, evidence: `src/features/customers/model.ts`, `src/features/products/model.ts`, `src/features/orders/model.ts`):

- Import `db` statically from `#/db/index` for standard features, or use dynamic `getDb()` only when code splitting is intentional.
- Generate IDs with `crypto.randomUUID()`.
- Use `buildOrderBy(sort, columnMap, fallback)` from `#/lib/sorting` for list pagination; define a `SortColumnMap` mapping field names to Drizzle column expressions.
- Filter soft-deleted rows with `isNull(table.deletedAt)` in every `list` and `get` query.
- Use a db-client type when a function must accept both `db` and a transaction client. The exported `DbClient` in `src/features/products/model.ts` is `Pick<typeof db, 'select'>`; `TaskSpawnClient` in `src/features/production/task-spawn-helpers.ts` is a local union type accepting both db and transaction clients with `select` and `insert`.

Completion criterion: every org-scoped model operation receives `orgId` explicitly in its arguments or input object and filters by it; every list query applies `buildOrderBy` with a `SortColumnMap` and a fallback `ORDER BY`; soft-deleted rows are excluded from reads; input types are defined and exported for server-function consumption.

### Step 3 — Server functions

Create or edit `src/features/<domain>/server.ts`. Every server function is a `createServerFn` from `@tanstack/react-start`.

Pattern (Observed, evidence: `src/features/customers/server.ts`):

```typescript
export const someFn = createServerFn({ method: 'POST' })
  .inputValidator((input: SomeInput) => input)
  .handler(async ({ data }): Promise<MutationResult> => {
    const orgId = await resolveOrgId()
    try {
      await modelFunction(data, orgId)
      return { ok: true }
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : 'Unknown error' }
    }
  })
```

Rules (Observed unless noted):

- Mutations use `method: 'POST'`; list/read queries use `method: 'GET'`.
- Mutations resolve tenant identity via `resolveOrgId()` from `#/lib/auth-session-server` — the primary pattern. Use `resolveOrgAndRole()` only when permission-gated operations require role data (production stage management). Use `resolveOrgContext()` only when route-level beforeLoad guards or richer auth context is needed (notifications).
- Return type for mutations: `MutationResult` from `#/lib/server-results` (or a discriminated union extending it, e.g. `{ ok: true; id: string } | { ok: false; error: string }`).
- Wrap mutation bodies in `try/catch`, returning `{ ok: false, error }` on failure. Queries may throw directly.
- `.inputValidator` uses passthrough type annotation (`(input: SomeType) => input`) for most endpoints. Zod `.parse()` is used only on invoice payment operations (Observed: `src/features/invoices/server.ts`).

**Validation contract** (Required): runtime validation MUST occur at server mutation boundaries. Model-layer validation functions (`validateX`) are the established mechanism — they return an error string or throw. Client-side or passthrough-only validation without server-side enforcement is insufficient.

Completion criterion: every `createServerFn` mutation calls `resolveOrgId()` (or the appropriate resolver) before any DB access; every mutation returns `MutationResult` or an extension of it; every mutation body is wrapped in `try/catch`; every mutation has runtime input validation either via a model-layer `validateX` function or Zod schema.

### Step 4 — React Query hooks

Create or edit `src/features/<domain>/hooks.ts`. Import `useQuery`, `useSuspenseQuery`, `useMutation`, `useQueryClient` from `@tanstack/react-query`; import `invalidateMutationQueries` from `#/lib/mutation-invalidation`; import `queryKeys` from `#/lib/query-keys`.

Patterns (Observed, evidence: `src/features/customers/hooks.ts`, `src/features/products/hooks.ts`):

- **List queries**: `useQuery` with `queryKey: queryKeys.<domain>.list(filters)` and `placeholderData: keepPreviousData`.
- **Detail queries**: `useSuspenseQuery` with `queryKey: queryKeys.<domain>.detail(id)`.
- **Create mutations**: `useMutation` → `onSuccess` calls `invalidateMutationQueries(queryClient, [queryKey: queryKeys.<domain>.lists()])`.
- **Update mutations**: `useMutation` → `onSuccess` invalidates both `lists()` and `detail(id)`.
- **Delete mutations**: `useMutation` → `onSuccess` invalidates `lists()` only.

Completion criterion: every list hook uses `keepPreviousData`; every detail hook uses `useSuspenseQuery`; every mutation hook calls `invalidateMutationQueries` in `onSuccess` with the correct scope of query keys.

### Step 5 — Query keys

If adding a new domain, add entries to `src/lib/query-keys.ts`. Follow the factory pattern (Observed):

```typescript
domain: {
  all: ['<domain>'] as const,
  lists: () => [...queryKeys.<domain>.all, 'list'] as const,
  list: (filters: FilterType) => [...queryKeys.<domain>.lists(), filters] as const,
  details: () => [...queryKeys.<domain>.all, 'detail'] as const,
  detail: (id: string) => [...queryKeys.<domain>.details(), id] as const,
},
```

Add domain-specific sub-keys only for genuinely distinct query shapes (e.g. `breakpoints`, `addons`, `pricing` on products; `history`, `adminTimeline` on orders).

Completion criterion: every domain accessed by a hook has a `queryKeys` entry with `all`, `lists()`, `list(filters)`, `details()`, `detail(id)`; sub-keys exist only for distinct query shapes with evidence of their use.

---

## Cross-Cutting Concerns

### Tenant Scoping

Every org-scoped table has an `orgId` text column with `references(() => organization.id, { onDelete: 'cascade' })`. Every query filters on `eq(table.orgId, orgId)`. The `orgId` flows from `resolveOrgId()` through server functions into model functions — never read from client state.

Portal features use token-based access (`getOrgIdFromToken()`) that resolves `orgId` from an order token, bypassing session auth. This is the only exception (Observed: `src/features/portal/server.ts`).

### Transactions

Use `db.transaction()` when multiple writes must be atomic. Canonical patterns (Observed):

- **Adjust-order quantity**: reprice line items + rewrite invoice in one transaction (`src/features/orders/model.ts`).
- **Spawn production tasks**: board transition + task creation in one transaction (`src/features/production/spawner.ts`).
- **Accept a transactional client**: functions that run inside and outside transactions accept `DbClient | TaskSpawnClient` (e.g. `spawnQueuedPreProductionTasksForOrder` in `src/features/production/task-spawn-helpers.ts`).

Pessimistic locking (`SELECT ... FOR UPDATE`) exists only in `src/features/assistant/server.ts` for draft proposal consumption.

### Cache Invalidation

All mutations invalidate via `invalidateMutationQueries(queryClient, [...keys])` in `onSuccess` (Observed). Scope varies:

- Simple creates: invalidate `lists()`.
- Updates with detail views: invalidate both `lists()` and `detail(id)`.
- Cross-domain mutations: invalidate keys across affected domains (e.g. completing production invalidates orders + invoices + production + portal + notifications).

### Soft Deletion

Only `customers` and `products` have a `deletedAt` timestamp column (migration 0027). Pattern (Observed: `src/features/customers/model.ts`):

- **Delete**: `db.update(table).set({ active: false, deletedAt: new Date(), updatedAt: new Date() })`.
- **Read filter**: every `list` and `get` query includes `isNull(table.deletedAt)`.

Soft deletion is application-level only — no DB-level enforcement.

### Validation Risk

**Conflict**: the codebase has inconsistent server-side validation. Model-layer `validateX` functions exist for customers (`validateCustomerInput`) and production stages (`validateStageRequirements`). Invoice payment endpoints use Zod schemas. Most other server functions use passthrough type annotation with no runtime validation. The Required project contract says runtime validation MUST occur at server mutation boundaries — current practice does not fully satisfy this. When adding a new data feature, always add runtime validation at the server-function boundary, even if adjacent features lack it.

### DbClient Import Inconsistency

**Observed risk**: products model uses `import { db } from '#/db/index'` (static), while customers and address use dynamic `getDb()`. New features should use the static import unless there is a code-splitting reason. The static import is simpler and matches the majority pattern.

---

## Verification

After completing the sequence:

1. Run `bun run typecheck` to confirm no type errors across schema, model, server, and hook layers.
2. Run existing domain tests for the changed feature: `bun run test -- src/features/<domain>/` — confirm all pass, no regressions.
3. If a migration was generated, confirm `bun run db:generate` completed and the journal entry exists in `drizzle/meta/_journal.json`.
4. Spot-check that `queryKeys` entries referenced by hooks exist and match the factory shape.
5. Confirm every mutation hook calls `invalidateMutationQueries` with the correct keys for the operations it covers.

Completion criterion: typecheck passes; existing tests pass; migration file exists if schema changed; query key references resolve; cache invalidation coverage matches mutation scope.

<!-- CODEBASE-SKILL-FORGE:HUMAN:START -->
<!-- Add intentional project policy here. Sync preserves this region byte-for-byte. -->
<!-- CODEBASE-SKILL-FORGE:HUMAN:END -->
