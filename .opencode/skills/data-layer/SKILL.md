---
name: data-layer
description: Database patterns — Drizzle ORM queries, schema conventions, RLS, search optimization (prefix/substring/full-text), N+1 prevention, batch operations, migrations. Use when writing DB queries, adding tables, creating migrations, optimizing slow queries, or handling search/filter endpoints.
---

# Data Layer

## Non-Negotiables

- MUST import `db` from `#/db/index` only.
- MUST use Drizzle query builder (`db.select/insert/update/delete`) — never raw SQL except in RLS helpers.
- MUST filter every business table query by `orgId` — resolved from session, not client.
- MUST add `orgId: text('org_id').notNull().references(() => organization.id, { onDelete: 'cascade' })` to every new business table.
- MUST use `crypto.randomUUID()` for new record IDs.
- MUST run DB changes through Drizzle migrations — never direct schema changes.
- MUST narrow `db.select()` to specific columns.
- MUST NOT use `LIKE '%term%'` without a `pg_trgm` GIN index.
- MUST NOT loop DB queries when batch operations work.
- MUST enforce minimum 3-char search for trigram-based (`%term%`) patterns.

## Schema Conventions

- IDs: `crypto.randomUUID()` (text/uuid)
- Timestamps: `timestamp({ withTimezone: true }).defaultNow().notNull()`
- Every table: `orgId: text('org_id').notNull().references(() => organization.id, { onDelete: 'cascade' })`

## Drizzle Queries

```typescript
import { db } from '#/db/index'
import { eq, and, ilike, inArray, desc, sql } from 'drizzle-orm'
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

## Search Patterns

### Prefix Search (`term%`) — B-tree Index
```sql
CREATE INDEX idx_table_name ON table_name (name);
```
```typescript
const pattern = `${searchTerm}%`
db.select({ ... }).from(table).where(ilike(table.name, pattern))
```

### Substring Search (`%term%`) — GIN + pg_trgm
```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_table_name_trgm ON table_name USING GIN (name gin_trgm_ops);
```
```typescript
const pattern = `%${searchTerm}%`
db.select({ ... }).from(table).where(ilike(table.name, pattern))
```
**Caveat**: Minimum 3 chars. Short patterns cannot use the trigram index.

### Full-Text Search — GIN on tsvector
```typescript
// Index in schema:
index('search_idx').using('gin', sql`to_tsvector('english', ${table.content})`)

// Multi-column with weights:
index('search_idx').using('gin', sql`(
  setweight(to_tsvector('english', ${table.title}), 'A') ||
  setweight(to_tsvector('english', ${table.description}), 'B')
)`)

// Query with ranking:
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

### Decision Table
| Pattern | Index | Min Length |
|---|---|---|
| `term%` (prefix) | B-tree | 1 |
| `%term%` (anywhere) | GIN + pg_trgm | 3 |
| Full-text (stemming) | GIN on tsvector | 1 |

## Batch Operations (N+1 Prevention)

### Batch Insert (Single query vs loop)
```typescript
// ✅ Single batch
await db.insert(table).values(items)

// ❌ Loop — N+1
for (const item of items) { await db.insert(table).values(item) }
```

### Batch Select (IN clause vs loop)
```typescript
// ✅ Single select
const items = await db.select().from(table).where(inArray(table.id, ids))

// ❌ Loop — N+1
for (const id of ids) { const [item] = await db.select().from(table).where(eq(table.id, id)) }
```

### Batch Update (Transaction vs individual)
```typescript
// ✅ Transaction wrapper (for limited, bounded loops)
await db.transaction(async (tx) => {
  for (const stage of stages) {
    await tx.update(table).set({ orderIndex: stage.orderIndex }).where(eq(table.id, stage.id))
  }
})

// ❌ Individual updates — N+1
for (const stage of stages) { await db.update(table).set(...).where(eq(table.id, stage.id)) }
```

## RLS (`#/lib/rls.ts`)

```typescript
import { setCurrentOrg, resetCurrentOrg, orgFilter } from '#/lib/rls'

await setCurrentOrg(orgId)       // Sets app.current_org_id PG session var
await resetCurrentOrg()           // Clears it

// In queries:
.where(and(eq(table.orgId, orgId), orgFilter('org_id')))
```

> Note: `orgFilter` is available but currently unused. Codebase filters org via `eq(table.orgId, orgId)` directly.

## Migrations

```bash
bun run db:generate   # Generate from schema changes
bun run db:migrate    # Apply migrations
bun run db:push       # Push schema directly (dev only)
bun run db:studio    # Open Drizzle Studio
```

## References

When you need deeper detail: [`references/database.md`](references/database.md) — schema conventions, RLS, migrations.
