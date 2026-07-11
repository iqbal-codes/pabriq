# Schema and Migrations Reference

Condition: this reference applies when adding, removing, or renaming columns or tables in `src/db/schema.ts` or generating/applying drizzle-kit migrations.

---

## pgTable Conventions

All tables are defined in the single file `src/db/schema.ts` via `pgTable` from `drizzle-orm/pg-core` (Observed: ~30 table declarations in a single file).

**Column types** (Observed):

- IDs: `text('id').primaryKey()` — UUIDs generated at application level via `crypto.randomUUID()`.
- Timestamps: `timestamp('created_at').notNull()` and `timestamp('updated_at').notNull()` with `.defaultNow()` or explicit `new Date()`.
- Booleans: `boolean('column_name')`.
- Numbers: `integer()`, `real()`.
- Text: `text()`.
- JSON: `json()`.

**Org scoping invariant** (Required): every domain table that is tenant-scoped MUST have:

```typescript
orgId: text('org_id')
  .notNull()
  .references(() => organization.id, { onDelete: 'cascade' })
```

Auth-managed tables (`user`, `session`, `account`, `verification`, `organization`, `member`, `invitation`) are defined in the same file but managed by better-auth — do not alter their columns.

**Index convention** (Observed): create `index('idx_<table>_<column>')` for foreign keys and frequently filtered columns; use `uniqueIndex` for unique constraints. Example: `index('idx_customers_org_id')` on `customers.orgId`.

**No Drizzle relations**: the codebase does not use Drizzle's `relations()` API. Joins are manual via subqueries or sequential queries. Do not add `relations()` definitions.

---

## Migration Workflow

**Config**: `drizzle.config.ts` — dialect `postgresql`, schema `./src/db/schema.ts`, output `./drizzle`.

**Generate**:

```bash
bun run db:generate
```

This reads `src/db/schema.ts`, diffs against the last migration, and writes a numbered SQL file under `drizzle/` plus a journal entry in `drizzle/meta/_journal.json`.

**Apply**:

```bash
bun run db:migrate
```

**Verify**:

```bash
bun run db:studio
```

Journal entries are sequential (0000–0031 as of evidence). Migration filenames use the pattern `<number>_<descriptive_name>.sql`.

**Soft-delete columns** (Observed, migration 0027): add a nullable `timestamp` column named `deleted_at` to enable application-level soft deletion. Example: `ALTER TABLE customers ADD COLUMN deleted_at timestamp;`

Completion criterion: `src/db/schema.ts` contains the new or changed table export; `drizzle/meta/_journal.json` has a matching entry; the generated SQL file exists under `drizzle/` and matches the schema change.
