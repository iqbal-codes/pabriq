# pabriq-app-v2 — Data Layer Pattern Catalog

> Read `../pabriq-app-v2-foundation/references/codebase-profile.md` first for shared stack and architecture context.
> This file expands the `pabriq-app-v2-data` skill with reusable query patterns and boilerplate preferences.

## How to use this catalog

- Prefer these existing patterns before creating new abstractions.
- Copy from the canonical examples listed here.
- If docs and source disagree, follow the drift note and verify in live source before editing.

## Patterns

### Paginated list with search and sort

- **Use when**: Any list/table page that needs search, filtering, sorting, and pagination
- **Prefer**: Copy the pattern from `src/features/customers/model.ts` `listCustomers`
- **Canonical examples**:
  - `src/features/customers/model.ts:137-200` — Full pattern: org scoping, search with `ilike`, status filter, `SortColumnMap`, `buildOrderBy`, parallel data+count via `Promise.all`
  - `src/features/products/server.ts:28-100` — Same pattern in a `createServerFn` handler with inline sub-select for computed column
- **Why**: Consistent UX across all list pages; type-safe projections; avoids N+1
- **Do**:
  - Define `SortColumnMap` for the table's sortable columns
  - Use `buildOrderBy(params.sort, SORT_COLUMNS, desc(table.createdAt))` for ordering
  - Run data + count queries in parallel via `Promise.all`
  - Narrow `select()` to only columns the list UI renders
  - Default `page = 1`, `perPage = 25`
- **Avoid**:
  - `db.select().from(table)` — fetches all columns
  - Sequential data then count queries
  - Inline sort logic instead of `buildOrderBy`

### Column-narrowed select

- **Use when**: Any `db.select()` call — always
- **Prefer**: Explicit column map in `db.select({ col: table.col, ... })`
- **Canonical examples**:
  - `src/features/customers/model.ts:176-184` — List: narrow to display columns only
  - `src/features/products/server.ts:61-83` — List with computed sub-select columns
- **Do**:
  - List only columns the caller actually uses
  - Use computed columns via `sql<T>\`...\`` when needed (e.g., aggregate sub-selects)
- **Avoid**:
  - `db.select().from(table)` — always wrong
  - Selecting columns the UI doesn't render

### Org-scoped CRUD

- **Use when**: Any create/update/delete/get operation on a business table
- **Prefer**: Model function taking `(id, orgId, ...)` with `eq(table.orgId, orgId)` in every query
- **Canonical examples**:
  - `src/features/customers/model.ts:290-334` — `getCustomer`: filter by both `id` and `orgId`, soft-delete check
  - `src/features/customers/model.ts:336-342` — `deleteCustomer`: soft delete with `deletedAt` + `updatedAt`
  - `src/features/products/model.ts:300-317` — `getProduct`: same pattern
- **Do**:
  - Always pass `orgId` from server functions (resolved from session)
  - Filter by `and(eq(table.id, id), eq(table.orgId, orgId))` for single-record lookups
  - Use soft delete: `set({ deletedAt: new Date(), updatedAt: new Date() })`
- **Avoid**:
  - Single-condition lookups: `eq(table.id, id)` without org check
  - Hard deletes on business tables
  - Accepting `orgId` from client input

### Search with ilike

- **Use when**: Text search across name, email, phone, or other text fields
- **Prefer**: `ilike(table.col, \`%${term}%\`)` wrapped in `or()` for multi-field search
- **Canonical examples**:
  - `src/features/customers/model.ts:146-155` — Multi-field search across name, email, phone
  - `src/features/products/server.ts:37-39` — Single-field search on product name
- **Do**:
  - Trim search input: `params.search.trim()`
  - Wrap in `or()` when searching multiple columns
  - Cast `or()` result: `or(...) as SQL`
  - Enforce minimum 3 characters in `.inputValidator()` for `%term%` pattern
- **Avoid**:
  - `LIKE '%term%'` (use `ilike` for case-insensitive)
  - Searching without `pg_trgm` GIN index (causes sequential scan)
  - Searching with < 3 characters on trigram-indexed columns

### Batch operations (N+1 prevention)

- **Use when**: Inserting, selecting, or updating multiple records
- **Prefer**: Single bulk operation over loops
- **Canonical examples**:
  - Batch insert: `db.insert(table).values(items)` — one query for all items
  - Batch select: `db.select().from(table).where(inArray(table.id, ids))` — one query
  - Batch update: `db.transaction(async (tx) => { for (...) await tx.update(...) })` — transaction-wrapped
- **Do**:
  - Use `insert().values(array)` for multiple inserts
  - Use `inArray()` for bulk lookups
  - Wrap per-item updates in a transaction when atomicity matters
- **Avoid**:
  - `for (const item of items) { await db.insert(table).values(item) }` — N queries
  - `for (const id of ids) { await db.select().where(eq(table.id, id)) }` — N queries
  - Trusting small loops will stay small

### ID generation

- **Use when**: Creating any new record
- **Prefer**: `crypto.randomUUID()` called at insert time
- **Canonical examples**:
  - `src/features/products/model.ts:112-114` — `function generateId(): string { return crypto.randomUUID() }`
- **Do**:
  - Generate IDs in the model function, not in the schema
  - Use `text('id').primaryKey()` in schema (UUID stored as text)
- **Avoid**:
  - Database-generated IDs (e.g., `serial`, `uuid()` default)
  - Client-generated IDs passed to server functions

### Soft delete

- **Use when**: Business records that should be hidden but not destroyed (customers, products)
- **Prefer**: `deletedAt` timestamp column + `isNull(table.deletedAt)` filter on reads
- **Canonical examples**:
  - `src/features/customers/model.ts:137-144` — Read filter: `isNull(customersTable.deletedAt)`
  - `src/features/customers/model.ts:336-342` — Delete: `set({ active: false, deletedAt: new Date(), updatedAt: new Date() })`
- **Do**:
  - Add `deletedAt: timestamp('deleted_at')` (nullable, no default)
  - Filter all reads: `isNull(table.deletedAt)`
  - Set both `deletedAt` and `updatedAt` on delete
- **Avoid**:
  - Hard deletes (`db.delete().where(...)`) on business tables
  - Forgetting the `isNull(deletedAt)` filter on list/get queries

### Computed columns via sub-selects

- **Use when**: A list query needs a value computed from a related table without a full join
- **Prefer**: Correlated sub-select in `sql<T>` projection
- **Canonical examples**:
  - `src/features/products/server.ts:78-82` — `minDiscountPrice` computed from `pricing_breakpoints`
- **Do**:
  - Use `sql<T>\`(SELECT ... FROM ... WHERE ...)\`` in the select projection
  - Keep sub-selects simple and indexed
- **Avoid**:
  - Full joins when only one aggregated value is needed
  - N+1 sub-selects per row (use a single correlated sub-select)

### Validation in model layer

- **Use when**: Input validation before DB operations
- **Prefer**: Pure validation function returning `string | null` (error message or null)
- **Canonical examples**:
  - `src/features/customers/model.ts:66` — `validateCustomerInput(input): string | null`
- **Do**:
  - Keep validation pure (no DB calls)
  - Return descriptive error string on failure, `null` on success
  - Call from `server.ts` before DB operations
- **Avoid**:
  - Validation only at the Zod/form level — model functions should also validate
  - Throwing from validation — return error strings

## Key files reference

| File | Purpose |
|---|---|
| `src/db/schema.ts` | All table definitions (~30 tables) |
| `src/db/index.ts` | DB client (pg Pool → Drizzle) |
| `drizzle.config.ts` | Drizzle Kit config |
| `src/lib/sorting.ts` | `buildOrderBy`, `SortColumnMap`, sort encode/decode |
| `src/lib/query-keys.ts` | TanStack Query key factory |
| `src/lib/validation-schemas.ts` | Shared Zod schemas |
| `src/features/*/model.ts` | Domain queries + business logic |
| `src/features/*/server.ts` | `createServerFn` wrappers with org resolution |
