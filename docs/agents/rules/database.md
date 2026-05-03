# Database Rules

## Purpose

Controls database access patterns, schema management, query construction, and tenant isolation.

## When To Read This

- Adding or modifying a database table.
- Writing a new server function that queries the database.
- Adding a Drizzle migration.
- Reviewing a PR for org-scoped query patterns.

## Current Project Pattern

**ORM:** Drizzle ORM v0.45 with PostgreSQL dialect.

**Schema:** `src/db/schema.ts` — all table definitions using `pgTable` from `drizzle-orm/pg-core`. Every business table carries an `orgId` column referencing `organization.id` with `onDelete: 'cascade'`.

**Database connection:** `src/db/index.ts` — connects to Postgres via `pg` Pool using the `DATABASE_URL` environment variable. `DATABASE_URL` is required in all environments.

**Migrations:** `drizzle-kit` with config at `drizzle.config.ts`. Migrations live in `drizzle/`. Scripts:
- `bun run db:generate` — generate migrations from schema changes.
- `bun run db:migrate` — apply migrations.
- `bun run db:push` — push schema directly (useful for development).
- `bun run db:studio` — open Drizzle Studio.

**Query patterns:** All queries go through the imported `db` instance. Queries use Drizzle's query builder with conditions, joins, and ordering.

**Tenant isolation (RLS):** `src/lib/rls.ts` provides:
- `setCurrentOrg(orgId)` — sets `app.current_org_id` for the current session.
- `resetCurrentOrg()` — clears the org context.
- `orgFilter(orgIdCol)` — returns a SQL fragment used in WHERE clauses.

RLS enforcement is done via application-level WHERE filters using `orgFilter`. Every business table query MUST filter by org. The pattern:

```ts
import { orgFilter } from '#/lib/rls'
// In a query:
.where(and(eq(table.orgId, orgId), orgFilter('org_id')))
```

## Non-Negotiable Rules

- MUST import `db` from `#/db/index` for all database access.
- MUST NOT use a raw `pg` Pool or `drizzle-orm/node-postgres` directly outside `src/db/index.ts`.
- MUST use Drizzle's query builder (`db.select()`, `db.insert()`, `db.update()`, `db.delete()`) — MUST NOT use raw SQL strings except in `orgFilter` helper.
- MUST filter every business table query by `orgId` — either directly or via `orgFilter` from `src/lib/rls.ts`.
- MUST NOT trust a client-provided `orgId` for data access — org context must come from the authenticated session.
- MUST use `crypto.randomUUID()` for new record IDs.
- MUST NOT drop tables or alter schema except through Drizzle migrations.
- MUST add new tables with `orgId` column referencing `organization.id` with `onDelete: 'cascade'`.

## Allowed Exceptions

- `src/lib/rls.ts` uses raw SQL for `set_config` and `current_setting` — this is the established pattern for application-level RLS context.
- `src/db/index.ts` uses raw `Pool` constructor — this is the single authorized database connection factory.

## Implementation Checklist

1. Define the table in `src/db/schema.ts` using `pgTable`.
2. Ensure the table has `orgId: text('org_id').notNull().references(() => organization.id, { onDelete: 'cascade' })`.
3. Run `bun run db:generate` to create the migration.
4. Write server functions that filter queries by org.

## Verification

```
bun run typecheck
bun run db:generate   # verify migration is created
```

Manual check: open the generated SQL migration — every new table must have an `org_id` FK.

## Common Mistakes To Avoid

- Forgetting to add `orgId` to a new business table.
- Using a raw SQL string in a server function instead of Drizzle query builder.
- Importing `db` from a path other than `#/db/index`.
- Trusting a client-provided `orgId` in a query instead of resolving org from the session.
- Running `db:push` in production instead of using migrations.
- Running tests without `.env.test` loaded — model tests require `DATABASE_URL`.
