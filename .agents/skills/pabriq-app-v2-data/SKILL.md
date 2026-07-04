---
name: pabriq-app-v2-data
description: How the data layer works in the pabriq-app-v2 codebase: schemas live in src/db/schema.ts as Drizzle ORM pgTable definitions, the PostgreSQL client is instantiated in src/db/index.ts via a pg Pool, and feature-level queries live in src/features/*/model.ts using Drizzle's query builder. Migrations are generated and run through Drizzle Kit into drizzle/. Use whenever the user adds or edits database schemas, queries, migrations, model logic, or any data layer code in pabriq-app-v2.
---

# pabriq-app-v2 — Data Layer

The data layer is a Drizzle ORM setup on PostgreSQL. Schemas are defined in a single file, the client is initialized as a top-level `await` in a module, and feature modules contain all query logic. There are no repository abstractions or raw SQL files — everything goes through Drizzle's type-safe query builder.

> Read `../pabriq-app-v2-foundation/references/codebase-profile.md` first for the stack, architecture, and tooling context. This skill adds the data-layer-specific details.

## Where things live

- `src/db/schema.ts` — All Drizzle `pgTable` definitions (25+ tables covering auth, customers, products, orders, invoices, production, assets).
- `src/db/index.ts` — PostgreSQL connection pool and Drizzle client initialization.
- `src/db/connection-string.ts` — SSL normalization helper for the connection URL.
- `drizzle.config.ts` — Drizzle Kit config pointing to `./src/db/schema.ts` and outputting to `./drizzle/`.
- `drizzle/` — Generated SQL migration files and snapshot metadata (`_journal.json`).
- `src/features/*/model.ts` — All database queries live here, not in a shared repository layer. Each feature module (customers, orders, invoices, production, assets, etc.) owns its own queries.

## How we do data here

### Schema definitions — `pgTable` with `text` primary keys

All tables use `text('id').primaryKey()` (UUID strings via `crypto.randomUUID()`). Multi-tenant isolation is enforced via `orgId` foreign key references to `organization.id` with `onDelete: 'cascade'`. Timestamps use `timestamp('created_at').notNull().defaultNow()`.

> from `src/db/schema.ts`

```ts
export const customers = pgTable('customers', {
  id: text('id').primaryKey(),
  orgId: text('org_id')
    .notNull()
    .references(() => organization.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  businessName: text('business_name'),
  email: text('email'),
  phone: text('phone'),
  address: text('address'),
  notes: text('notes'),
  active: boolean('active').notNull().default(true),
  isWni: boolean('is_wni').notNull().default(true),
  photoAssetId: text('photo_asset_id').references(() => assets.id, {
    onDelete: 'set null',
  }),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})
```

Why: Every domain table follows this shape — `id` (text), `orgId` (FK to org, cascade), `createdAt`/`updatedAt`, and domain fields. Soft deletes use `deletedAt: timestamp('deleted_at')`.

### Database client — top-level `await` with pg Pool

The client is a module-level `await` that creates a `pg.Pool`, validates connectivity, and returns a typed Drizzle instance. Import `db` from `#/db` in feature modules.

> from `src/db/index.ts`

```ts
export const db = await (async () => {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) throw MissingDatabaseUrlError()

  const { Pool } = await import('pg')
  const pool = new Pool({
    connectionString: normalizePostgresConnectionString(databaseUrl),
    connectionTimeoutMillis: 10000,
  })
  try {
    const client = await pool.connect()
    client.release()
    const { drizzle } = await import('drizzle-orm/node-postgres')
    return drizzle(pool, { schema })
  } catch (cause) {
    await pool.end().catch(() => {})
    throw new Error(
      `Failed to connect to PostgreSQL at ${databaseUrl.replace(/:.+@/, ':****@')}`,
      { cause },
    )
  }
})()
```

Why: Top-level `await` ensures the DB is connected before any query. Pool connection string is SSL-normalized via `normalizePostgresConnectionString()`. Connection errors surface the masked URL.

### Paginated list queries — `Promise.all` pattern with count

List queries fetch rows and total count in parallel via `Promise.all`. Conditions are built as an `SQL[]` array, composed with `and(...)`, and passed to `.where()`. Sorting uses a shared `buildOrderBy()` helper from `#/lib/sorting`.

> from `src/features/customers/model.ts`

```ts
const [rows, countResult] = await Promise.all([
  db
    .select({
      id: customersTable.id,
      name: customersTable.name,
      email: customersTable.email,
      phone: customersTable.phone,
      active: customersTable.active,
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
return { rows, totalRows: Number(countResult[0]?.count ?? 0) }
```

Why: The pattern is consistent across all list functions — parallel row+count selects, explicit column projection, `buildOrderBy()` for sort, page/perPage pagination.

### Insert with `.returning()` and ID generation

IDs are generated via `crypto.randomUUID()` in the model layer. Inserts use `.returning()` for auto-generated columns or return the generated ID directly.

> from `src/features/production/model.ts`

```ts
const id = generateId()
const rows = await db
  .insert(stagesTable)
  .values({
    id,
    orgId: input.orgId,
    name: input.name,
    board,
    description: input.description ?? null,
    needApproval: input.needApproval ?? false,
    requirements: (input.requirements ?? []) as Requirement[],
    orderIndex,
    active: true,
    createdAt: now,
    updatedAt: now,
  })
  .returning()
return rows[0] as Stage
```

Why: IDs are always client-generated UUIDs, not database-generated. `.returning()` is used when the full row shape is needed back. All nullable fields are explicitly set to `null` rather than omitted.

## Commands

- Generate migration: `bun run db:generate` (drizzle-kit generate)
- Run migrations: `bun run db:migrate` (drizzle-kit migrate)
- DB Studio: `bun run db:studio` (drizzle-kit studio)
- DB Studio (Infisical): `bun run db:studio:infisical` (load-env dev -- bun run db:studio)

## Conventions observed

- Single schema file: All tables are defined in `src/db/schema.ts` — no per-feature schema splitting.
- `pgTable` naming: The first argument to `pgTable()` matches the SQL table name (e.g. `pgTable('customers', ...)` maps to table `customers`). Exported variable names are camelCase (e.g. `customers`, `orderLineItems`).
- Foreign keys: Always use `.references(() => table.id, { onDelete: 'cascade' | 'restrict' | 'set null' })`. Cascade for owned children (org → customers), restrict for important references (customer → order), set null for optional references (payment → asset).
- JSON columns: Typed via `.json('col').$type<T>()` — used for structured data like `requirements: Requirement[]` and `context: { productName: string; ... }`.
- Query location: All DB queries live in `src/features/*/model.ts`, never in server functions or hooks. Server functions (`server.ts`) call model functions.
- No repository layer: Feature model files import `db` directly and build Drizzle queries inline.
- Import alias: Internal imports use `#/` prefix (e.g. `import { db } from '#/db'`, `import * as customersTable from '#/db/schema'`).
- Table imports in models: Feature models import schema tables as aliased names (e.g. `import * as customersTable from '#/db/schema'`) to avoid name collisions.
- `getDb()` helper: Some models wrap `db` in an async `getDb()` function (currently just re-exports the module-level `db`), providing a seam for future connection management.
- Soft delete: `deletedAt` timestamp column; queries filter with `isNull(table.deletedAt)` and deletes set `deletedAt: new Date()` instead of deleting the row.
- Migration naming: Drizzle Kit auto-generates descriptive names (e.g. `0027_soft_delete_customers_products.sql`). The `drizzle/meta/_journal.json` tracks migration ordering.

## Anti-patterns to avoid

- No raw SQL or `sql` template literals for queries — use Drizzle's query builder for type safety.
- No `select *` — always project explicit columns in list queries.
- No per-feature schema files — keep all table definitions in `src/db/schema.ts`.
- No query logic in `server.ts` files — server functions call model functions, which own all DB access.
- No omitting `orgId` from queries — every query must filter by `orgId` for multi-tenant isolation (there is no RLS).
- No omitting `deletedAt` filtering — always add `isNull(table.deletedAt)` when querying soft-deletable tables (customers, products).

## Gaps / verify

- No database seeding commands or files exist in `package.json` or the codebase. Developers must populate data through the application or manually.
- The codebase profile mentions `src/lib/rls.ts` and `orgFilter` but `rls.ts` does not exist. All multi-tenant filtering is done via explicit `eq(table.orgId, orgId)` in each query — verify this remains the case when adding new queries.
- No migration rollback mechanism is configured — Drizzle Kit does not support down migrations. Schema changes should be additive when possible.
