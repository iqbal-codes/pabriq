---
name: pabriq-app-v2-data
description: How the data layer works in the pabriq-app-v2 codebase: schemas live in src/db/schema.ts as Drizzle ORM pgTable definitions, the PostgreSQL client is instantiated in src/db/index.ts via a pg Pool, and feature-level queries live in src/features/*/model.ts using Drizzle's query builder. Migrations are generated and run through Drizzle Kit into drizzle/. Use whenever the user adds or edits database schemas, queries, migrations, model logic, or any data layer code in pabriq-app-v2.
---

# pabriq-app-v2 — Data Layer

The data layer is Drizzle ORM on PostgreSQL. All table definitions live in a single `src/db/schema.ts` file (~30 tables), the DB client is a pg Pool in `src/db/index.ts`, and feature-level queries live in `src/features/*/model.ts`. Server functions in `src/features/*/server.ts` call model functions with org resolution.

> Read `../pabriq-app-v2-foundation/references/codebase-profile.md` first for the stack, architecture, and tooling context. This skill adds data-layer specifics.

## Where things live

- **Schema definitions**: `src/db/schema.ts` — all tables in one file, ~590 lines
- **DB client**: `src/db/index.ts` — pg Pool → Drizzle instance, exported as `db`
- **Connection string normalization**: `src/db/connection-string.ts`
- **Drizzle config**: `drizzle.config.ts` — dialect: postgresql, schema: `./src/db/schema.ts`, output: `./drizzle`
- **Migrations**: `drizzle/` — generated SQL files, 29 migrations
- **Feature models**: `src/features/*/model.ts` — pure logic + DB queries per domain
- **Server functions**: `src/features/*/server.ts` — `createServerFn` wrappers with org resolution
- **Sorting utility**: `src/lib/sorting.ts` — `buildOrderBy`, `SortColumnMap`, encode/decode
- **RLS helpers**: `src/lib/rls.ts` — `setCurrentOrg`, `resetCurrentOrg`, `orgFilter` (documented but currently unused; codebase uses `eq(orgId, ...)` directly)
- **Query keys**: `src/lib/query-keys.ts` — TanStack Query key factory
- **Validation schemas**: `src/lib/validation-schemas.ts` — shared Zod schemas

## Schema conventions

### Core patterns (non-negotiable)

Every business table follows this template — `orgId` FK, UUID PK via `crypto.randomUUID()`, and timezone-aware timestamps:

> from `src/db/schema.ts` (customers table, line 123)
```typescript
export const customers = pgTable('customers', {
  id: text('id').primaryKey(),
  orgId: text('org_id')
    .notNull()
    .references(() => organization.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  // ... domain columns ...
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})
```

For AI actions, the `assistantActions` table captures pending/completed proposals from the AI assistant:

> from `src/db/schema.ts` (line 547)
```typescript
export const assistantActions = pgTable(
  'assistant_actions',
  {
    id: text('id').primaryKey(),
    orgId: text('org_id').notNull().references(() => organization.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull(),
    threadId: text('thread_id').notNull(),
    kind: text('kind').notNull(),
    status: text('status').notNull().default('pending'),
    payload: json('payload').$type<AssistantActionPayload>().notNull(),
    resultOrderId: text('result_order_id'),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  }
)
```

### Naming conventions

- **JS export names**: camelCase (`customers`, `products`, `orderLineItems`)
- **DB table names**: snake_case (`customers`, `products`, `order_line_items`)
- **Column JS names**: camelCase (`createdAt`, `orgId`, `basePrice`)
- **Column DB names**: snake_case (`created_at`, `org_id`, `base_price`)
- **Primary keys**: always `text('id').primaryKey()` — IDs are `crypto.randomUUID()` strings
- **Foreign keys**: `text('..._id').references(() => otherTable.id, { onDelete: '...' })`

### Common column types

| Pattern | Type | Example |
|---|---|---|
| ID / FK / text | `text()` | `id`, `orgId`, `name`, `midtransOrderId` |
| Boolean flag | `boolean().notNull().default(true)` | `active`, `isWni` |
| Integer amount | `integer().notNull().default(0)` | `basePrice`, `productionDays` |
| Decimal amount | `real().notNull().default(0)` | `total` on orders |
| JSON blob | `json()` | `shippingAddress` on orders, `payload` on assistantActions |
| Timestamp | `timestamp('...').notNull().defaultNow()` | `createdAt`, `updatedAt` |
| Optional timestamp | `timestamp('...')` (no default, nullable) | `deletedAt`, `shippedAt` |
| Status enum | `text().notNull().default('draft')` | `status` on orders |

### Indexes

Defined as the third argument to `pgTable`:

> from `src/db/schema.ts` (invoices, line 327)
```typescript
export const invoices = pgTable(
  'invoices',
  { /* columns */ },
  (table) => [
    uniqueIndex('idx_invoices_org_number').on(table.orgId, table.invoiceNumber),
  ],
)
```

Use `index()` for standard B-tree, `uniqueIndex()` for uniqueness constraints. Index naming: `idx_{table}_{columns}`.

## How queries work

### The data flow

```
Route loader → createServerFn → org resolution from session → model function → Drizzle query → Postgres
```

Server functions in `src/features/*/server.ts` call model functions in `src/features/*/model.ts`. Org ID comes from the authenticated session, never from the client.

### Org scoping (mandatory)

Every business table query MUST filter by `orgId`. The org ID is resolved server-side from the session:

> from `src/features/customers/model.ts` (listCustomers, line 137)
```typescript
const conditions: SQL[] = [
  eq(customersTable.orgId, params.orgId),
  isNull(customersTable.deletedAt),
]
```

**Never** trust a client-provided `orgId` for data access. The `server.ts` layer resolves it from the session before calling model functions.

### Column narrowing (mandatory)

Always select only the columns you need — never `db.select().from(table)`:

> from `src/features/customers/model.ts` (listCustomers, line 174)
```typescript
const [rows, countResult] = await Promise.all([
  db
    .select({
      id: customersTable.id,
      name: customersTable.name,
      email: customersTable.email,
      phone: customersTable.phone,
      active: customersTable.active,
      photoAssetId: customersTable.photoAssetId,
      createdAt: customersTable.createdAt,
    })
    .from(customersTable)
    .where(allConditions)
    .orderBy(orderBy)
    .limit(perPage)
    .offset((page - 1) * perPage),
  db
    .select({ count: sql<number>`count(*)` })
    .from(customersTable)
    .where(allConditions),
])
```

### Pagination pattern

All list queries follow the same shape — parallel data + count queries via `Promise.all`, with `limit`/`offset`:

```typescript
const page = params.page ?? 1
const perPage = params.perPage ?? 25

const [rows, countResult] = await Promise.all([
  db.select({ /* narrowed cols */ }).from(table).where(conditions)
    .orderBy(orderBy).limit(perPage).offset((page - 1) * perPage),
  db.select({ count: sql<number>`count(*)` }).from(table).where(conditions),
])

return { rows, totalRows: Number(countResult[0]?.count ?? 0) }
```

### Sort integration

- Models define a `SortColumnMap` and use `buildOrderBy` from `#/lib/sorting`:

> from `src/features/customers/model.ts` (line 130)
```typescript
const CUSTOMER_SORT_COLUMNS = {
  name: customersTable.name,
  email: customersTable.email,
  createdAt: customersTable.createdAt,
  active: customersTable.active,
} satisfies SortColumnMap
```

Then: `const orderBy = buildOrderBy(params.sort, CUSTOMER_SORT_COLUMNS, desc(table.createdAt))`

### Soft delete pattern

Several tables use `deletedAt` for soft deletes. Queries filter with `isNull(table.deletedAt)`. Deletions set `deletedAt` and `updatedAt`:

> from `src/features/customers/model.ts` (deleteCustomer, line 336)
```typescript
await db
  .update(customersTable)
  .set({ active: false, deletedAt: new Date(), updatedAt: new Date() })
  .where(and(eq(customersTable.id, id), eq(customersTable.orgId, orgId)))
```

## Search patterns

| Pattern | Index type | Drizzle | Min chars |
|---|---|---|---|
| Prefix (`term%`) | B-tree | `ilike(col, \`${term}%\`)` | none |
| Anywhere (`%term%`) | GIN + pg_trgm | `ilike(col, \`%${term}%\`)` | 3 |
| Full-text (stemming) | GIN on tsvector | `sql\`to_tsvector @@ to_tsquery\`` | 3 |

Current codebase uses `%term%` with `ilike` for name/email/phone searches. Any substring search (`%term%`) **requires** `pg_trgm` + GIN index — otherwise it causes full sequential scans. Enforce minimum 3 characters in `.inputValidator()`.

## Batch operations (N+1 prevention)

- **Batch insert**: `await db.insert(table).values(items)` — never loop individual inserts
- **Batch select**: `await db.select().from(table).where(inArray(table.id, ids))` — never loop individual selects
- **Batch update**: `await db.transaction(async (tx) => { for (...) await tx.update(...) })` — transaction-wrapped for atomicity

## Migrations

```bash
bun run db:generate   # Generate migration from schema changes in src/db/schema.ts
bun run db:migrate    # Apply pending migrations from drizzle/
bun run db:push       # Push schema directly (dev only, never production)
bun run db:studio     # Open Drizzle Studio for inspection
```

Migrations live in `drizzle/` as numbered SQL files. Generated by Drizzle Kit (`drizzle.config.ts`). Never alter schema outside Drizzle — always generate and apply migrations.

## RLS (application-level)

The codebase provides RLS helpers in `src/lib/rls.ts` (`setCurrentOrg`, `resetCurrentOrg`, `orgFilter`), but **currently unused** — the established pattern is filtering directly with `eq(table.orgId, orgId)`. See Open Questions in the foundation profile for the decision on whether to adopt or remove `orgFilter`.

## Commands

- Generate migrations: `bun run db:generate`
- Apply migrations: `bun run db:migrate`
- Push schema (dev): `bun run db:push`
- Open Drizzle Studio: `bun run db:studio`
- Typecheck: `bun run typecheck`
- Run model tests: `bun run test` (requires `DATABASE_URL` pointing to staging DB)

## Conventions observed

- All tables defined in `src/db/schema.ts` — single file, no split across modules
- Import `db` from `#/db/index` only — never raw `pg` Pool or direct `drizzle-orm/node-postgres`
- Use Drizzle query builder — no raw SQL strings except in RLS helpers and inline sub-selects
- `crypto.randomUUID()` for all new record IDs
- `import type` for type-only imports (`verbatimModuleSyntax`)
- `#/` import alias for all internal paths
- `SortColumnMap` + `buildOrderBy` for server-side sorting
- Discriminated unions `{ ok: true, data: T } | { ok: false, error: string }` for mutation results

## Anti-patterns to avoid

- `db.select().from(table)` — always narrow columns explicitly
- `LIKE '%term%'` without `pg_trgm` + GIN index
- Looping DB queries when batch operations exist (`inArray`, batch `insert`, transaction-wrapped loops)
- Trusting client-provided `orgId` — always resolve from session
- `db:push` in production
- Importing `db` from any path other than `#/db/index`
- Mixing raw SQL in model functions (exception: inline sub-selects in `select()` projections)

## Gaps / verify

- `src/lib/rls.ts` is documented in boilerplate (`docs/agents/boilerplate/database.md`) but the file does not appear to exist in `src/lib/`. The codebase uses `eq(table.orgId, orgId)` directly. Verify whether `rls.ts` was removed or moved.
- Some `db.select()` calls in older models (e.g., `getCustomer`) still use `select()` without column narrowing. New queries MUST narrow columns.
- The `ilike` search pattern (`%term%`) is used without visible `pg_trgm` GIN indexes in the schema. Verify whether these indexes exist in migrations or need to be added.
- The `@/*` alias exists alongside `#/` for shadcn/ui compatibility. Data layer code MUST use `#/` exclusively.

## References

- [Data Pattern Catalog](references/data-patterns.md) — reusable query patterns, pagination, search, batch ops
