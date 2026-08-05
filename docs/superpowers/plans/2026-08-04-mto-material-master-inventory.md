# MTO Material Master and Inventory Ledger Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add organization-owned material master data, an auditable inventory movement ledger, atomic reservations, and stock-readiness summaries for MTO operations.

**Architecture:** Materials are organization-scoped master records with soft deletion and validated units/conversions. Inventory is append-only movement history plus reservation records; on-hand, reserved, available, incoming, projected, and shortage values are derived in one material-operations model rather than edited directly. Reservation allocation is transactional and attributable to an order requirement, so shared stock cannot be double allocated.

**Tech Stack:** TypeScript, Drizzle ORM/PostgreSQL, TanStack Start server functions, Zod 4, TanStack Query, TanStack Form, DataTable, use-intl, Vitest through Bun scripts.

## Global Constraints

- Depends on product templates and committed specification snapshots from `2026-08-04-mto-product-templates.md` and `2026-08-04-mto-specification-execution.md` only for later requirement links; material master and ledger remain usable independently.
- Every material, movement, reservation, and requirement row is organization-scoped and every query filters `eq(table.orgId, orgId)`.
- Stock changes are ledger movements; no unaudited direct stock edit is allowed.
- Material units and conversions are validated data, not arbitrary arithmetic strings.
- Reservations must be atomic, attributable, releasable, and safe under concurrent attempts.
- Criticality is explicit: critical shortages block production readiness; non-critical shortages remain visible but do not block.
- Server functions validate external input, resolve organization from session, enforce owner/admin/operator permissions, and return discriminated mutation results.
- Use `#/` imports, `import type`, no `any`, no non-null assertions, translated Indonesian/English copy, and safe commands through `bun run test`.

---

### Task 1: Define material, unit, movement, and readiness contracts

**Files:**
- Create: `src/features/materials/types.ts`
- Create: `src/features/materials/constants.ts`
- Create: `src/features/materials/validation.ts`
- Test: `src/features/materials/validation.test.ts`

**Interfaces:**
- `MaterialUnit = 'piece' | 'meter' | 'centimeter' | 'kilogram' | 'gram' | 'liter' | 'milliliter' | 'sheet'`.
- `MaterialConversion = { from: MaterialUnit; to: MaterialUnit; factor: number }`.
- `MaterialMovementType = 'receipt' | 'adjustment' | 'reservation' | 'reservation_release' | 'issue' | 'consumption' | 'return' | 'waste' | 'transfer'`.
- `MaterialReadiness = 'not_checked' | 'partially_available' | 'awaiting_procurement' | 'ready' | 'blocked'`.
- `validateMaterialInput`, `validateConversion`, `validateMovementInput`, and `summarizeMaterialAvailability`.

- [ ] **Step 1: Write failing pure tests**

```ts
it('rejects zero, negative, self, and cyclic conversions', () => {
  expect(() => validateConversion({ from: 'meter', to: 'centimeter', factor: 0 })).toThrow()
  expect(() => validateConversion({ from: 'meter', to: 'meter', factor: 100 })).toThrow()
})

it('classifies critical shortages separately from non-critical shortages', () => {
  expect(summarizeMaterialAvailability({ planned: 10, onHand: 6, reserved: 2, incoming: 0, critical: true }))
    .toMatchObject({ available: 4, shortage: 6, readiness: 'blocked', blocksProduction: true })
  expect(summarizeMaterialAvailability({ planned: 10, onHand: 6, reserved: 2, incoming: 4, critical: false }))
    .toMatchObject({ projected: 8, blocksProduction: false })
})
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `bun run test -- src/features/materials/validation.test.ts`
Expected: FAIL because the contracts do not exist.

- [ ] **Step 3: Implement pure validation and availability summaries**

Require positive quantities/factors, valid base units, unique conversions, finite numbers, non-negative cost and thresholds, and movement types from the closed union. Compute `available = onHand - reserved`, `projected = available + incoming`, shortage against planned quantity, readiness, and `blocksProduction` in one function.

- [ ] **Step 4: Run the focused test and verify it passes**

Run: `bun run test -- src/features/materials/validation.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit the contract seam**

```bash
git add src/features/materials/types.ts src/features/materials/constants.ts src/features/materials/validation.ts src/features/materials/validation.test.ts
git commit -m "feat: define material inventory contracts"
```

### Task 2: Persist materials and the append-only movement ledger

**Files:**
- Modify: `src/db/schema.ts`
- Create via Drizzle: `drizzle/0035_mto_material_inventory.sql`
- Modify via generation: `drizzle/meta/_journal.json` and the matching snapshot
- Create: `src/features/materials/model.ts`
- Test: `src/features/materials/model.test.ts`

**Interfaces:**
- `Material`, `MaterialMovement`, `CreateMaterialInput`, `UpdateMaterialInput`, `AdjustMaterialStockInput`, and `MaterialListOptions`.
- `listMaterials`, `getMaterial`, `createMaterial`, `updateMaterial`, `archiveMaterial`, `recordMovement`, `listMaterialMovements`, and `getMaterialAvailability`.

- [ ] **Step 1: Write DB integration tests**

```ts
it('keeps movement history and on-hand totals together', async () => {
  const material = await createMaterial({ orgId: org1Id, sku: 'FAB-1', name: 'Fabric', baseUnit: 'meter' })
  await recordMovement({ orgId: org1Id, materialId: material.id, type: 'receipt', quantity: 20, unit: 'meter', actorId })
  expect((await getMaterialAvailability(material.id, org1Id)).onHand).toBe(20)
  expect(await listMaterialMovements(material.id, org1Id)).toHaveLength(1)
})

it('cannot read an organization-owned material from another organization', async () => {
  expect(await getMaterial(materialId, org2Id)).toBeNull()
})
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `bun run test -- src/features/materials/model.test.ts`
Expected: FAIL because schema and model functions do not exist.

- [ ] **Step 3: Add schema and generated migration**

Add `materials` with SKU, name, category, description, base unit, JSON conversions, unit cost, supplier reference, lead time, MOQ, reorder point, safety stock, lot-tracking flag, active/deleted timestamps, and org FK. Add `material_movements` with signed quantity, unit, movement type, order/requirement reference, actor, note, optional waste reason, and timestamps. Add `material_reservations` with org, material, requirement/order/line-item references, quantity, status (`active | released | consumed`), and timestamps. Add indexes for org, SKU, material, movement type, requirement, and active reservations.

- [ ] **Step 4: Implement transactional model functions**

Use `db.transaction()` for movement + material summary updates and for reservation allocation/release. Reject negative resulting on-hand for issue/adjustment/transfer-out. Verify all referenced records share `orgId`. Archive materials rather than deleting referenced records; prevent new reservations against archived materials. Store each movement once and make repeated release/consume commands idempotent by reservation/movement identity.

- [ ] **Step 5: Run focused integration tests and verify they pass**

Run: `bun run test -- src/features/materials/model.test.ts`
Expected: PASS for CRUD, soft archive, ledger history, negative-stock guard, organization isolation, reservation release, and repeated command behavior.

- [ ] **Step 6: Commit persistence**

```bash
git add src/db/schema.ts drizzle/0035_mto_material_inventory.sql drizzle/meta src/features/materials/model.ts src/features/materials/model.test.ts
git commit -m "feat: add material master and inventory ledger"
```

### Task 3: Expose material operations through server functions and hooks

**Files:**
- Create: `src/features/materials/server.ts`
- Create: `src/features/materials/hooks.ts`
- Modify: `src/lib/query-keys.ts`
- Modify: `src/features/permissions/model.ts`
- Test: `src/features/materials/server.test.ts`, `src/features/materials/hooks.test.ts`

**Interfaces:**
- Server functions: `listMaterialsFn`, `getMaterialFn`, `createMaterialFn`, `updateMaterialFn`, `archiveMaterialFn`, `recordMaterialMovementFn`, `listMaterialMovementsFn`, `getMaterialAvailabilityFn`, `reserveMaterialFn`, and `releaseMaterialReservationFn`.
- Hooks: `useMaterialsList`, `useMaterial`, `useCreateMaterial`, `useUpdateMaterial`, `useArchiveMaterial`, `useRecordMaterialMovement`, `useMaterialMovements`, `useMaterialAvailability`, `useReserveMaterial`, and `useReleaseMaterialReservation`.
- Permission predicates: `canViewMaterials(role)` and `canManageMaterials(role)`. Use existing `canAdvanceProductionTask(role)` for operator/member stock-operation actions; do not add a third predicate unless a test demonstrates that this existing permission is too broad.

- [ ] **Step 1: Add boundary and invalidation tests**

```ts
it('does not accept client orgId for a material mutation', async () => {
  const result = await createMaterialFn({ data: { orgId: 'other-org', sku: 'X', name: 'X', baseUnit: 'piece' } })
  expect(result.ok).toBe(false)
})

it('invalidates material list and detail keys after update', async () => {
  const queryClient = new QueryClient()
  const mutation = renderHook(() => useUpdateMaterial(), { wrapper: queryClientWrapper })
  await mutation.result.current.mutateAsync({ id: materialId, name: 'Updated' })
  expect(queryClient.getQueryState(queryKeys.materials.lists())?.isInvalidated).toBe(true)
  expect(queryClient.getQueryState(queryKeys.materials.detail(materialId))?.isInvalidated).toBe(true)
})
```

- [ ] **Step 2: Run focused tests and verify they fail**

Run: `bun run test -- src/features/materials/server.test.ts src/features/materials/hooks.test.ts`
Expected: FAIL because functions, keys, and predicates do not exist.

- [ ] **Step 3: Implement server validation and role checks**

Resolve org from the authenticated session before database access. Use Zod schemas for every mutation. Return `{ ok: true } | { ok: false; error: string }`; reject member material-master changes while allowing operator/member stock actions through the existing production-task permission predicate. The server tests must mock the session boundary and assert the model receives the resolved organization, never the input `orgId`.

- [ ] **Step 4: Add query keys and hooks**

Add `queryKeys.materials` with list/detail/movements/availability/reservations factories. Use `keepPreviousData` for lists, `useSuspenseQuery` for details, and `invalidateMutationQueries` on every successful mutation.

- [ ] **Step 5: Run focused tests and verify they pass**

Run: `bun run test -- src/features/materials/server.test.ts src/features/materials/hooks.test.ts`
Expected: PASS after the server validators, role checks, query keys, and invalidation callbacks are implemented.

- [ ] **Step 6: Commit the API seam**

```bash
git add src/features/materials/server.ts src/features/materials/hooks.ts src/lib/query-keys.ts src/features/permissions/model.ts src/features/materials/server.test.ts src/features/materials/hooks.test.ts
git commit -m "feat: expose scoped material operations"
```
### Task 4: Build material master and stock UI

**Files:**
- Create: `src/features/materials/components/material-form-fields.tsx`
- Create: `src/features/materials/components/material-form-sheet.tsx`
- Create: `src/features/materials/components/stock-adjust-dialog.tsx`
- Create: `src/features/materials/pages/materials-list-page.tsx`
- Create: `src/routes/_org/materials/index.tsx`
- Create: `src/routes/_org/materials/new.tsx`
- Create: `src/routes/_org/materials/$id/index.tsx`
- Modify: `src/components/app-sidebar.tsx`
- Modify: `src/messages/types.ts`, `src/messages/en.ts`, `src/messages/id.ts`
- Test: `src/features/materials/pages/materials-list-page.test.tsx`, `src/components/app-sidebar.test.tsx`, `src/routes/_org/materials/-route.test.tsx`

**Interfaces:**
- The page consumes Task 3 hooks and renders master data, low-stock/shortage status, movement history, and stock adjustment actions.
- Routes are org-guarded; member/operator visibility uses `canViewMaterials`, and create/edit/archive routes require `canManageMaterials`.

- [ ] **Step 1: Write failing UI and route tests**

```tsx
expect(screen.getByText('materials.lowStock')).toBeVisible()
expect(screen.getByRole('button', { name: 'materials.adjustStock' })).toBeVisible()
```

Cover loading/error/empty/data states, disabled invalid adjustment, mobile cards, translated labels, sidebar visibility, and unauthorized redirect.

- [ ] **Step 2: Run focused tests and verify they fail**

Run: `bun run test -- src/features/materials/pages/materials-list-page.test.tsx src/components/app-sidebar.test.tsx src/routes/_org/materials/-route.test.tsx`
Expected: FAIL because the feature and routes do not exist.

- [ ] **Step 3: Implement UI using existing app primitives**

Use `PageHeader`, `PageContent`, `DataTable`, mobile cards, `FormSheet`, `useAppForm`, `EmptyState`, `FormError`, and `globalOverlaySearchSchema`. Show on-hand/reserved/available and the exact shortage/blocked reason; do not present fake availability or silently hide archived rows.

- [ ] **Step 4: Add localized navigation and form copy**

Add material, movement, unit, readiness, shortage, permission, and error messages to both locales and the `Messages` type. Add breadcrumb/sidebar labels without hardcoded user-facing strings.

- [ ] **Step 5: Run focused tests and verify they pass**

Run: `bun run test -- src/features/materials/pages/materials-list-page.test.tsx src/components/app-sidebar.test.tsx src/routes/_org/materials/-route.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit the UI**

```bash
git add src/features/materials src/routes/_org/materials src/components/app-sidebar.tsx src/messages
 git commit -m "feat: add material inventory workspace"
```

### Task 5: Verify material master and inventory delivery

**Files:**
- Test: all material model/server/component/route tests
- Test: `e2e/materials.spec.ts`

**Interfaces:**
- No new API; proves material creation, stock movement, reservation, release, and readiness presentation.

- [ ] **Step 1: Add and run the browser smoke flow**

Use existing E2E auth helpers to create a material, receive stock, reserve part of it, inspect on-hand/reserved/available, release the reservation, and verify the movement history. Never truncate in E2E.

Run: `bun run test:e2e -- e2e/materials.spec.ts`
Expected: PASS.

- [ ] **Step 2: Run targeted domain tests**

```bash
bun run test -- src/features/materials src/features/permissions/model.test.ts src/components/app-sidebar.test.tsx
```

Expected: PASS with no direct Vitest invocation.

- [ ] **Step 3: Run type, check, and build gates**

```bash
bun run typecheck
bun run check
bun run build
```

Expected: PASS; migration metadata and schema exports are consistent.

- [ ] **Step 4: Commit verification changes**

```bash
git add src e2e drizzle
 git commit -m "test: verify material inventory delivery"
```
