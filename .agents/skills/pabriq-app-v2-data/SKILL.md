---
name: pabriq-app-v2-data
description: How the data layer works in the pabriq-app-v2 codebase: schemas live in src/db/schema.ts as Drizzle ORM pgTable definitions, the PostgreSQL client is instantiated in src/db/index.ts via a pg Pool, and feature-level queries live in src/features/*/model.ts using Drizzle's query builder. Migrations are generated and run through Drizzle Kit into drizzle/. Use whenever the user adds or edits database schemas, queries, migrations, model logic, or any data layer code in pabriq-app-v2.
---

# pabriq-app-v2 — Data Layer

The data layer is Drizzle ORM on PostgreSQL (Neon). All table definitions live in a single `src/db/schema.ts` file (~591 lines, ~30+ tables), the DB client is a pg Pool in `src/db/index.ts`, and feature-level queries live in `src/features/*/model.ts`. Server functions in `src/features/*/server.ts` call model functions with org resolution.

> Read `../pabriq-app-v2-foundation/references/codebase-profile.md` first for the stack, architecture, and tooling context. This skill adds data-layer specifics.

## Where things live

| Path | Purpose |
|---|---|
| `src/db/schema.ts` | All pgTable definitions (~30 tables, ~591 lines) |
| `src/db/index.ts` | pg Pool → Drizzle instance, exported as `db` |
| `src/db/connection-string.ts` | Connection string normalization |
| `drizzle.config.ts` | Drizzle Kit config: dialect `postgresql`, schema `./src/db/schema.ts`, output `./drizzle` |
| `drizzle/` | Generated migration SQL files (32 migrations) |
| `drizzle/meta/_journal.json` | Migration journal (ordered apply list) |
| `src/features/*/model.ts` | Pure logic + DB queries per domain |
| `src/features/*/server.ts` | `createServerFn` wrappers with org resolution |
| `src/lib/sorting.ts` | `buildOrderBy`, `SortColumnMap`, `encodeSort`/`decodeSort` |
| `src/lib/query-keys.ts` | TanStack Query key factory |
| `src/lib/validation-schemas.ts` | Shared Zod schemas |

## Schema conventions

### Core template (non-negotiable)

Every business table follows this pattern — `orgId` FK, UUID PK, timezone-aware timestamps:

> from `src/db/schema.ts` (customers table)
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

### Recent schema additions (migration 0030)

> from `src/db/schema.ts` and `drizzle/0030_violet_rhodey.sql`

**organization_profiles** — `lateFeePerDay`:
```typescript
lateFeePerDay: integer('late_fee_per_day').notNull().default(0),
```

**orders** — `deadline` + `manualDeadline`:
```typescript
deadline: timestamp('deadline'),
manualDeadline: boolean('manual_deadline').notNull().default(false),
```

**invoices** — `lateFee`:
```typescript
lateFee: real('late_fee').notNull().default(0),
```

### Naming conventions

- **JS export names**: camelCase (`customers`, `products`, `orderLineItems`)
- **DB table names**: snake_case (`customers`, `products`, `order_line_items`)
- **Column JS names**: camelCase (`createdAt`, `orgId`, `basePrice`, `lateFeePerDay`)
- **Column DB names**: snake_case (`created_at`, `org_id`, `base_price`, `late_fee_per_day`)
- **Primary keys**: always `text('id').primaryKey()` — IDs are `crypto.randomUUID()` strings
- **Foreign keys**: `text('..._id').references(() => otherTable.id, { onDelete: '...' })`

### Common column types

| Pattern | Drizzle type | Example |
|---|---|---|
| ID / FK / text | `text()` | `id`, `orgId`, `name` |
| Boolean flag | `boolean().notNull().default(true)` | `active`, `manualDeadline` |
| Integer amount | `integer().notNull().default(0)` | `basePrice`, `lateFeePerDay` |
| Decimal amount | `real().notNull().default(0)` | `total` on orders, `lateFee` on invoices |
| JSON blob | `json()` | `shippingAddress`, `payload` |
| Timestamp | `timestamp('...').notNull().defaultNow()` | `createdAt`, `updatedAt` |
| Optional timestamp | `timestamp('...')` (nullable) | `deletedAt`, `shippedAt`, `deadline` |
| Status enum | `text().notNull().default('draft')` | `status` on orders |

### Indexes

Defined as the third argument to `pgTable`:

> from `src/db/schema.ts` (invoices)
```typescript
export const invoices = pgTable(
  'invoices',
  { /* columns */ },
  (table) => [
    uniqueIndex('idx_invoices_org_number').on(table.orgId, table.invoiceNumber),
  ],
)
```

Use `index()` for standard B-tree, `uniqueIndex()` for uniqueness. Index naming: `idx_{table}_{columns}`.

## How queries work

### Data flow

```
Route loader → createServerFn → org resolution from session → model function → Drizzle query → Postgres
```

Server functions in `src/features/*/server.ts` call model functions in `src/features/*/model.ts`. Org ID comes from the authenticated session, never from the client.

### Org scoping (mandatory)

Every business table query MUST filter by `orgId`:

> from `src/features/customers/model.ts` (listCustomers)
```typescript
const conditions: SQL[] = [
  eq(customersTable.orgId, params.orgId),
  isNull(customersTable.deletedAt),
]
```

**Never** trust a client-provided `orgId`. The `server.ts` layer resolves it from the session.

### Column narrowing (mandatory)

Always select only the columns you need:

> from `src/features/customers/model.ts` (listCustomers)
```typescript
const [rows, countResult] = await Promise.all([
  db
    .select({
      id: customersTable.id,
      name: customersTable.name,
      email: customersTable.email,
      // ... display columns only
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

All list queries: parallel data + count via `Promise.all`, with `limit`/`offset`:

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

Models define a `SortColumnMap` and use `buildOrderBy` from `#/lib/sorting`:

> from `src/lib/sorting.ts`
```typescript
import { buildOrderBy, type SortColumnMap } from '#/lib/sorting'

const SORT_COLUMNS = {
  name: table.name,
  createdAt: table.createdAt,
} satisfies SortColumnMap

const orderBy = buildOrderBy(params.sort, SORT_COLUMNS, desc(table.createdAt))
```

`buildOrderBy` accepts `SortState | null | undefined`, a `SortColumnMap`, and a fallback SQL expression. Returns an `asc()`/`desc()` or `sql` fragment with nulls handling.

### Soft delete pattern

Queries filter with `isNull(table.deletedAt)`. Deletions set both `deletedAt` and `updatedAt`:

> from `src/features/customers/model.ts` (deleteCustomer)
```typescript
await db
  .update(customersTable)
  .set({ active: false, deletedAt: new Date(), updatedAt: new Date() })
  .where(and(eq(customersTable.id, id), eq(customersTable.orgId, orgId)))
```

### Portal model refactoring

`src/features/portal/model.ts` separates timeline logic into two functions:

- `getOrderTimelineByOrderId(orderId, orgId)` — standalone export, queries order + invoices + payments directly with org scoping
- `getOrderTimeline(token)` — thin wrapper that resolves the token to an order, then delegates to `getOrderTimelineByOrderId`

This allows backend code (e.g., server functions) to build timelines without a portal token.

### Invoice creation with custom product total

> from `src/features/invoices/model.ts` (createInvoice)
```typescript
export async function createInvoice(
  orgId: string,
  input: CreateInvoiceInput,
): Promise<CreateInvoiceResult> {
```

`CreateInvoiceInput` accepts an optional `customProductTotal?: number` — when provided, it overrides the computed `order.total * (percentage / 100)`. The `lateFee` field is clamped to non-negative: `Math.max(0, input.lateFee ?? 0)`.

## Search patterns

| Pattern | Index type | Drizzle | Min chars |
|---|---|---|---|
| Prefix (`term%`) | B-tree | `ilike(col, \`${term}%\`)` | none |
| Anywhere (`%term%`) | GIN + pg_trgm | `ilike(col, \`%${term}%\`)` | 3 |

Current codebase uses `%term%` with `ilike` for name/email/phone searches. Any substring search (`%term%`) **requires** `pg_trgm` + GIN index. Enforce minimum 3 characters in `.inputValidator()`.

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

Migrations live in `drizzle/` as numbered SQL files (currently 32). Generated by Drizzle Kit (`drizzle.config.ts`). Never alter schema outside Drizzle — always generate and apply migrations.

## Commands

| Command | Purpose |
|---|---|
| `bun run db:generate` | Generate Drizzle migration from `src/db/schema.ts` changes |
| `bun run db:migrate` | Apply pending migrations from `drizzle/` |
| `bun run db:push` | Push schema directly (dev only, never production) |
| `bun run db:studio` | Open Drizzle Studio |
| `bun run typecheck` | TypeScript type check |
| `bun run test` | Vitest (requires `DATABASE_URL` pointing to staging DB) |

## Conventions observed

- All tables defined in `src/db/schema.ts` — single file, no split across modules
- Import `db` from `#/db/index` only — never raw `pg` Pool or direct `drizzle-orm/node-postgres`
- Use Drizzle query builder — no raw SQL strings except in inline sub-selects within `select()` projections
- `crypto.randomUUID()` for all new record IDs
- `import type` for type-only imports (`verbatimModuleSyntax`)
- `#/` import alias for all internal paths (except shadcn/ui which uses `@/`)
- `SortColumnMap` + `buildOrderBy` for server-side sorting
- Discriminated unions `{ ok: true, data: T } | { ok: false, error: string }` for mutation results
- Soft delete: set `deletedAt` + `updatedAt`, filter reads with `isNull(table.deletedAt)`

## Anti-patterns to avoid

- `db.select().from(table)` — always narrow columns explicitly
- `LIKE '%term%'` without `pg_trgm` + GIN index
- Looping DB queries when batch operations exist (`inArray`, batch `insert`, transaction-wrapped loops)
- Trusting client-provided `orgId` — always resolve from session
- `db:push` in production
- Importing `db` from any path other than `#/db/index`
- Mixing raw SQL in model functions (exception: inline sub-selects in `select()` projections)
- `db.select()` calls without column narrowing — new queries MUST narrow columns

## Gaps / verify

- `src/lib/rls.ts` was documented in boilerplate but does not exist. The codebase uses `eq(table.orgId, orgId)` directly everywhere. The `orgFilter` helper should be considered deprecated.
- Some older model functions may still use `select()` without column narrowing. New queries MUST narrow columns.
- The `ilike` search pattern (`%term%`) is used without visible `pg_trgm` GIN indexes in the schema — verify whether these exist in migrations or need to be added.
- The `@/*` alias exists alongside `#/` for shadcn/ui compatibility. Data layer code MUST use `#/` exclusively.

## References

- [Data Pattern Catalog](references/data-patterns.md) — reusable query patterns, pagination, search, batch ops
