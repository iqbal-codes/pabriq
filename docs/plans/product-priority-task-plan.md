# Implementation Plan

## Goal
Add a product-level `priority` flag that is captured on newly spawned production tasks and causes priority tasks to sort to the top of their current kanban bucket.

## Tasks
1. **Add persistent priority fields for products and production tasks**
   - File: `src/db/schema.ts`
   - Changes: add `priority: boolean('priority').notNull().default(false)` to both `products` and `production_tasks`.
   - File: `drizzle/0023_*.sql`
   - Changes: generate a migration that adds both columns with `DEFAULT false NOT NULL` so existing rows stay valid without backfill.
   - File: `drizzle/meta/*`
   - Changes: commit generated Drizzle metadata updates for the new migration.
   - Acceptance: schema and migration both represent the new columns; existing rows resolve to `false` after migration.

2. **Wire product priority through product types and persistence**
   - File: `src/features/products/model.ts`
   - Changes: add `priority` to `Product`, `CreateProductInput`, and `UpdateProductInput`; persist it in `createProduct()` and `updateProduct()`.
   - File: `src/features/products/model.test.ts`
   - Changes: add coverage that new products default to `false`, explicit `priority: true` is saved, and updates can toggle the flag.
   - Acceptance: product create/update flows round-trip the boolean correctly and model tests cover default + toggle behavior.

3. **Expose the product priority toggle in the product form and validation**
   - File: `src/features/products/components/product-form-fields.tsx`
   - Changes: add `priority: false` to form defaults and render a translated boolean control in the existing product form.
   - File: `src/features/products/pages/create-product-page.tsx`
   - Changes: include `priority` in create-page default values so it is submitted with the rest of the form.
   - File: `src/features/products/pages/edit-product-page.tsx`
   - Changes: include `priority` in edit-page default values from the loaded product.
   - File: `src/lib/validation-schemas.ts`
   - Changes: extend `productFormSchema` with `priority: z.boolean()`.
   - File: `src/features/products/components/product-form-fields.test.tsx`
   - Changes: assert the new translated label/control renders.
   - File: `src/features/products/pages/create-product-page.test.tsx`
   - Changes: update test messages/defaults for the new field.
   - File: `src/features/products/pages/edit-product-page.test.tsx`
   - Changes: update mocked product data and test messages to include `priority`.
   - File: `src/lib/validation-schemas.test.ts`
   - Changes: update valid product fixtures to include the boolean and add a success-path assertion for `priority: true`.
   - File: `src/messages/en.ts`
   - Changes: add English product-form copy for the new priority label/help text.
   - File: `src/messages/id.ts`
   - Changes: add Indonesian translations for the same keys.
   - File: `src/messages/types.ts`
   - Changes: update checked-in message typings if they are maintained manually in this repo.
   - Acceptance: create/edit product forms render the toggle, validation accepts it, and all new user-facing text is translated in both locales.

4. **Propagate product priority into both task spawn paths**
   - File: `src/features/production/spawner.ts`
   - Changes: in both `spawnTasksForApprovedOrder()` and `spawnProductionTasks()`, batch-load the referenced products by `productId`, build a `{ productId -> priority }` map, and set `production_tasks.priority` when creating each task.
   - Acceptance: both approval-driven and in-progress spawn flows create tasks whose `priority` matches the source product snapshot at spawn time.

5. **Make active board ordering priority-first and surface the flag on task cards**
   - File: `src/features/production/model.ts`
   - Changes: add `priority` to `ProductionTask`; introduce deterministic bucket ordering in `listBoardTasks()` so each returned bucket sorts by `priority desc`, then `createdAt asc`, then `id asc`.
   - File: `src/features/production/components/kanban-task-card.tsx`
   - Changes: add a small translated visual indicator for priority tasks so the top-of-list behavior is understandable in the UI.
   - File: `src/features/production/components/kanban-task-card.test.tsx`
   - Changes: add `priority` to fixtures and assert the indicator renders only for priority tasks.
   - File: `src/features/production/components/kanban-column.test.tsx`
   - Changes: update typed task fixtures with the new boolean field.
   - File: `src/features/production/components/kanban-board.test.tsx`
   - Changes: update typed task fixtures with the new boolean field.
   - File: `src/features/production/components/task-detail-modal.test.tsx`
   - Changes: update mocked task payloads with the new boolean field if TypeScript requires it.
   - Acceptance: priority tasks appear first within `queued`, each stage bucket, and `done`; non-priority tasks keep deterministic relative order; task cards visibly distinguish priority tasks.

6. **Add production-level regression tests and run the required validation pipeline**
   - File: `src/features/production/model.test.ts`
   - Changes: add DB-backed tests that (a) spawned tasks inherit product priority, including both spawn paths if practical, and (b) `listBoardTasks()` returns priority tasks before non-priority tasks inside the same bucket.
   - Changes: keep archived task behavior unchanged unless a failing test proves the new type requires a small fixture update elsewhere.
   - Acceptance: `bun run check`, `bun run typecheck`, `bun run test`, and `bun run build` all pass. `bun run build` is required because this change touches database-backed server behavior and task spawning logic.

## Files to Modify
- `src/db/schema.ts` - add `priority` columns to `products` and `production_tasks`.
- `src/features/products/model.ts` - extend product types and persistence for `priority`.
- `src/features/products/model.test.ts` - verify default and updated priority persistence.
- `src/features/products/components/product-form-fields.tsx` - add the product priority form control.
- `src/features/products/components/product-form-fields.test.tsx` - cover the new form control.
- `src/features/products/pages/create-product-page.tsx` - add `priority` to form defaults.
- `src/features/products/pages/edit-product-page.tsx` - hydrate and submit `priority` in edit flow.
- `src/features/products/pages/create-product-page.test.tsx` - update i18n fixtures/messages for the new field.
- `src/features/products/pages/edit-product-page.test.tsx` - update mocked product data/messages for the new field.
- `src/lib/validation-schemas.ts` - add boolean validation for `priority`.
- `src/lib/validation-schemas.test.ts` - update product schema fixtures/tests.
- `src/messages/en.ts` - add English labels/help text.
- `src/messages/id.ts` - add Indonesian labels/help text.
- `src/messages/types.ts` - keep message typings aligned if manually maintained.
- `src/features/production/spawner.ts` - snapshot product priority into spawned tasks in both spawn paths.
- `src/features/production/model.ts` - add task priority typing and priority-first kanban ordering.
- `src/features/production/model.test.ts` - verify propagation and ordering behavior.
- `src/features/production/components/kanban-task-card.tsx` - show a priority indicator on active task cards.
- `src/features/production/components/kanban-task-card.test.tsx` - verify the indicator behavior.
- `src/features/production/components/kanban-column.test.tsx` - update typed board-task fixtures.
- `src/features/production/components/kanban-board.test.tsx` - update typed board-task fixtures.
- `src/features/production/components/task-detail-modal.test.tsx` - update mocked task payload shape if needed.

## New Files
- `drizzle/0023_*.sql` - migration adding `priority` columns with safe defaults.
- `drizzle/meta/*` - generated Drizzle metadata for the migration.

## Dependencies
- Task 1 must land before any model or UI code that reads/writes the new columns.
- Task 2 must land before Task 3 so form submissions have a typed persistence target.
- Task 4 depends on Task 1 because spawned tasks need the new `production_tasks.priority` column.
- Task 5 depends on Task 1 and Task 4 so the board can sort and display persisted task priority.
- Task 6 depends on Tasks 1-5.

## Risks
- The current order-fetch path only returns line items, not product snapshots; the spawner should batch-load product priorities by `productId` instead of expanding unrelated order APIs.
- `listBoardTasks()` currently fetches unsorted tasks and groups in memory; the implementation must add an explicit stable sort so ordering does not depend on database return order.
- Adding `priority` to `ProductionTask` and `Product` types will likely require small fixture updates in tests that construct typed objects inline.
- Non-goal: no retroactive backfill or reorder of already spawned tasks beyond the database default of `false`.
- Non-goal: no archived-task table column/filter unless requested later; archived ordering can remain `archivedAt desc` for now.
- Open question to validate during implementation: whether the priority task card indicator should reuse an existing badge style or introduce a dedicated variant without expanding scope beyond this feature.
