# Query Patterns Rules

> **Reference:** [`../boilerplate/database.md`](../boilerplate/database.md) — search patterns, batch operations, column narrowing.

## Purpose

Controls query performance, search optimization, and N+1 prevention across all database operations.

## When To Read This

- Adding a search/filter endpoint that uses `LIKE`, `ILIKE`, or full-text search.
- Writing any server function that queries the database in a loop.
- Reviewing a PR for performance-critical query patterns.
- Debugging slow database queries.

## Current Project Pattern

**Search queries:** Current codebase uses `ILIKE '%search%'` for name/email/phone searches across products, customers, and orders. These patterns cause full sequential scans without `pg_trgm` indexes.

**Query patterns:** Most `db.select()` calls fetch all columns (`db.select().from(table)`) instead of narrowing to needed fields.

**N+1 risk:** Order creation iterates over line items with individual DB queries per item. Production task spawning uses a similar per-item loop.

## Non-Negotiable Rules

- MUST narrow column selection in `db.select()` — always use `db.select({ col1: table.col1, col2: table.col2 })`.
- MUST NOT use `LIKE '%term%'` or `ILIKE '%term%'` without enabling `pg_trgm` and creating a corresponding GIN index.
- MUST NOT loop over database queries when a batch operation is possible (`insert()`, `update()`, `delete()` accept arrays).
- MUST NOT query business tables without filtering by `orgId`.
- MUST enforce a minimum 3-character search length for any query using trigram-based (`%term%`) search patterns.

## Allowed Exceptions

- Prefix-only patterns (`'ORD-2026-%'`) may use a B-tree index instead of GIN+trigram — B-tree is faster and smaller for this case.
- Full-text search with `to_tsvector`/`to_tsquery` uses GIN indexes on `tsvector` columns, not `pg_trgm`.
- Transaction-wrapped loops for batch updates (e.g., reordering stages) are acceptable when the number of items is small and bounded.

## Implementation Checklist

1. Determine search pattern type: prefix-only (`term%`) vs anywhere (`%term%`) vs full-text.
2. For prefix-only: create a B-tree index on the column.
3. For anywhere: enable `pg_trgm` extension and create a GIN index.
4. Enforce minimum 3-character search in the `.inputValidator()`.
5. Always narrow `db.select()` to only the columns used by the caller.
6. Replace per-item DB loops with batch operations or transactions.

## Verification

```
bun run typecheck
```

Manual: Check `EXPLAIN ANALYZE` output for search queries — they should show index scans, not sequential scans.

## Common Mistakes To Avoid

- Using `LIKE '%term%'` without `pg_trgm` GIN index — causes full table scan on every query.
- Fetching all columns with `db.select().from(table)` — wastes bandwidth and prevents type narrowing.
- Looping over DB inserts instead of using batch insert — N queries instead of 1.
- Trusting that a small loop today will stay small — always use batch patterns.
- Allowing < 3 char searches on trigram-indexed columns — the index won't be used.
