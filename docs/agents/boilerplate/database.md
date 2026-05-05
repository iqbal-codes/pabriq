# Database

> **Rules:** [`../rules/database.md`](../rules/database.md) — non-negotiables, checklists, common mistakes.
> **Rules:** [`../rules/query-patterns.md`](../rules/query-patterns.md) — search optimization, N+1 prevention.

## Schema Conventions

- Every business table has `orgId: text('org_id').notNull().references(() => organization.id, { onDelete: 'cascade' })`
- IDs use `crypto.randomUUID()`
- Timestamps use `timestamp({ withTimezone: true }).defaultNow().notNull()`

## Drizzle Queries

```typescript
import { db } from '#/db/index'
import { eq, and, like, ilike, or, desc, asc, sql } from 'drizzle-orm'
import { myTable } from '#/db/schema'

// Select — always narrow columns
const items = await db
  .select({ id: myTable.id, name: myTable.name })
  .from(myTable)
  .where(eq(myTable.orgId, orgId))

// Insert
const [item] = await db.insert(myTable).values({ id: crypto.randomUUID(), ... }).returning()

// Update
const [item] = await db.update(myTable).set({ name: 'new' }).where(eq(myTable.id, id)).returning()

// Delete
await db.delete(myTable).where(eq(myTable.id, id))
```

## Column Narrowing

Always select only the columns you need — this reduces data transfer and enables type-safe projections:

```typescript
// ❌ Fetches ALL columns
db.select().from(table)

// ✅ Fetches only what's needed
db.select({ id: table.id, name: table.name }).from(table)

// ✅ With join
db.select({
  id: orders.id,
  customerName: customers.name,
  status: orders.status,
}).from(orders)
  .innerJoin(customers, eq(orders.customerId, customers.id))
```

## Search Patterns

### Prefix Search (`term%`) — Use B-tree Index

For searches where the pattern starts with known characters, a standard B-tree index works:

```sql
CREATE INDEX idx_table_name ON table_name (name);
```

```typescript
const pattern = `${searchTerm}%`
const items = await db.select({ id: table.id, name: table.name })
  .from(table)
  .where(ilike(table.name, pattern))
```

### Substring Search (`%term%`) — Requires pg_trgm + GIN Index

For searches anywhere in the string, enable `pg_trgm` and create a GIN index:

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_table_name_trgm ON table_name USING GIN (name gin_trgm_ops);

-- For case-insensitive search:
CREATE INDEX idx_table_name_trgm_lower ON table_name USING GIN (LOWER(name) gin_trgm_ops);
```

```typescript
const pattern = `%${searchTerm}%`
const items = await db.select({ id: table.id, name: table.name })
  .from(table)
  .where(ilike(table.name, pattern))
```

**Caveats:**
- Minimum 3 characters — trigrams shorter than 3 cannot use the index
- Enforce min search length in your application
- GIN indexes use 2-3x the indexed column space

### Full-Text Search (PostgreSQL Built-in)

For document/content search with stemming and ranking:

```typescript
import { sql } from 'drizzle-orm'

// Index (defined in schema):
index('search_idx').using('gin', sql`to_tsvector('english', ${table.content})`)

// Multi-column with weights:
index('search_idx').using('gin', sql`(
  setweight(to_tsvector('english', ${table.title}), 'A') ||
  setweight(to_tsvector('english', ${table.description}), 'B')
)`)

// Query:
const results = await db
  .select({
    id: table.id,
    title: table.title,
    rank: sql`ts_rank(to_tsvector('english', ${table.content}), plainto_tsquery('english', ${searchTerm}))`,
  })
  .from(table)
  .where(sql`to_tsvector('english', ${table.content}) @@ plainto_tsquery('english', ${searchTerm})`)
  .orderBy((t) => desc(t.rank))
```

### Search Strategy Decision

| Pattern | Index | Drizzle Operator |
|---|---|---|
| `term%` (prefix) | B-tree | `ilike(col, \`${term}%\`)` |
| `%term%` (anywhere) | GIN + pg_trgm | `ilike(col, \`%${term}%\`)` |
| Full-text (stemming) | GIN on tsvector | `sql\`to_tsvector @@ to_tsquery\`` |
| `< 3 chars` | Fallback to B-tree prefix | `ilike(col, \`${term}%\`)` |

## Batch Patterns (Avoiding N+1)

### Batch Insert (Instead of Loop)

```typescript
// ❌ N+1 — individual inserts in a loop
for (const item of items) {
  await db.insert(table).values(item)
}

// ✅ Single batch insert
await db.insert(table).values(items)
```

### Batch Select (Instead of Loop)

```typescript
// ❌ N+1 — individual selects in a loop
for (const id of ids) {
  const [item] = await db.select().from(table).where(eq(table.id, id))
}

// ✅ Single select with IN clause
const items = await db.select().from(table).where(inArray(table.id, ids))
```

### Batch Update

```typescript
// ❌ N+1 — individual updates
for (const stage of stages) {
  await db.update(table).set({ orderIndex: stage.orderIndex }).where(eq(table.id, stage.id))
}

// ✅ Batch update with transaction
await db.transaction(async (tx) => {
  for (const stage of stages) {
    await tx.update(table).set({ orderIndex: stage.orderIndex }).where(eq(table.id, stage.id))
  }
})
```

## RLS (Application-Level, `src/lib/rls.ts`)

```typescript
import { setCurrentOrg, resetCurrentOrg, orgFilter } from '#/lib/rls'

await setCurrentOrg(orgId)      // Sets app.current_org_id for session
await resetCurrentOrg()          // Clears it

// In queries — always filter by org:
.where(and(eq(table.orgId, orgId), orgFilter('org_id')))
```

> **Note:** `orgFilter` is available but currently unused. The codebase filters org via `eq(table.orgId, orgId)` directly. Decide whether to adopt `orgFilter` consistently or remove it.

## Migrations

```bash
bun run db:generate   # Generate migration from schema changes
bun run db:migrate    # Apply migrations
bun run db:push       # Push schema directly (dev only)
bun run db:studio     # Open Drizzle Studio
```

## Key Rules

- Import `db` from `#/db/index` only
- Use Drizzle query builder, never raw SQL (except in RLS helpers)
- Always narrow `db.select()` to specific columns
- Filter every business table query by `orgId`
- Add `orgId` FK column to every new business table
- Run migrations through Drizzle, never direct schema changes
- Never use `LIKE '%term%'` without a corresponding `pg_trgm` GIN index
- Never loop over DB queries when a batch operation would work
