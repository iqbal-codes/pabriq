# MTO BOM Calculation and Material Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Calculate immutable order-specific material requirements from product-template BOMs and committed specifications, then include critical material readiness in production start.

**Architecture:** Product-template BOMs are structured data with explicit basis, unit, waste allowance, criticality, and conditions. A pure calculator evaluates a copied BOM against a committed specification snapshot and quantity; a transactional orchestration service persists the result as an order requirement with source BOM/snapshot context. Material availability/reservation uses the inventory ledger plan, and production start consumes a single readiness contract alongside existing payment and pre-production gates.

**Tech Stack:** TypeScript, Zod 4, Drizzle ORM/PostgreSQL, TanStack Start server functions, existing production/order models, Vitest through Bun scripts.

## Global Constraints

- Depends on `2026-08-04-mto-product-templates.md`, `2026-08-04-mto-specification-execution.md`, and `2026-08-04-mto-material-master-inventory.md`.
- BOM items use structured bases (`per_order`, `per_item`, matrix/per-item aggregation) and validated conditions; arbitrary executable formula strings are forbidden.
- Planned quantities/costs and actual movement quantities/costs remain separate.
- Requirements preserve the source BOM configuration and committed specification snapshot; later template/material edits never rewrite historical plans.
- Critical shortages block production start; non-critical shortages remain visible and do not block.
- All new records are organization-scoped and all server mutations validate and authorize.
- Existing order/payment/production/timeline behavior remains intact except for the additive critical-material gate.

---

### Task 1: Define and test the structured BOM calculator

**Files:**
- Create: `src/features/materials/bom-types.ts`
- Create: `src/features/materials/bom-validation.ts`
- Create: `src/features/materials/bom-calculator.ts`
- Test: `src/features/materials/bom-calculator.test.ts`

**Interfaces:**
- `BomBasis = 'per_order' | 'per_item' | 'matrix' | 'per_item_field'`.
- `BomCondition = { fieldKey: string; operator: 'equals' | 'in'; value: string | number | boolean | string[] }`.
- `BomItem = { materialId: string; basis: BomBasis; quantity: number; unit: MaterialUnit; wastePercent: number; critical: boolean; condition?: BomCondition; fieldKey?: string }`.
- `calculateBomRequirements(input: { bom: BomItem[]; snapshot: SpecificationSnapshot; orderedQuantity: number; materials: MaterialCost[] }): PlannedMaterialRequirement[]`.
- `validateBomConfiguration(input: unknown): BomItem[]`.

- [ ] **Step 1: Write failing calculation tests**

```ts
it('calculates fixed, per-item, matrix-aware, conditional, and waste quantities', () => {
  expect(calculateBomRequirements({
    orderedQuantity: 10,
    snapshot: perItemSnapshot,
    materials: [{ id: 'thread', baseUnit: 'meter', unitCost: 2 }],
    bom: [{ materialId: 'thread', basis: 'per_item', quantity: 2, unit: 'meter', wastePercent: 10, critical: true }],
  })).toMatchObject([{ plannedQuantity: 22, plannedCost: 44, critical: true }])
})

it('rejects unknown field conditions and negative waste', () => {
  expect(() => validateBomConfiguration([{ materialId: 'x', basis: 'per_order', quantity: 1, unit: 'piece', wastePercent: -1 }])).toThrow()
})
```

- [ ] **Step 2: Run focused tests and verify they fail**

Run: `bun run test -- src/features/materials/bom-calculator.test.ts`
Expected: FAIL because the calculator does not exist.

- [ ] **Step 3: Implement validation and deterministic evaluation**

Validate material references, positive quantities, 0–100 waste, compatible units/conversions, known snapshot field keys, and condition operators. Evaluate only matching conditions; calculate fixed/per-item/matrix/per-item-field quantities and add waste with explicit rounding rules. Return one requirement per material/unit/source item with planned cost from base-unit cost.

- [ ] **Step 4: Run focused tests and verify they pass**

Run: `bun run test -- src/features/materials/bom-calculator.test.ts`
Expected: PASS for all bases, conditions, aggregation, conversion, waste, cost, and invalid data cases.

- [ ] **Step 5: Commit the pure calculator**

```bash
git add src/features/materials/bom-types.ts src/features/materials/bom-validation.ts src/features/materials/bom-calculator.ts src/features/materials/bom-calculator.test.ts
git commit -m "feat: calculate structured material requirements"
```

### Task 2: Persist product-template BOMs and order requirements

**Files:**
- Modify: `src/db/schema.ts`
- Create via Drizzle: `drizzle/0036_mto_bom_requirements.sql`
- Modify via generation: `drizzle/meta/_journal.json` and snapshot metadata
- Modify: `src/features/product-templates/config.ts`, `src/features/product-templates/model.ts`
- Create: `src/features/materials/requirements-model.ts`
- Test: `src/features/materials/requirements-model.test.ts`

**Interfaces:**
- `ProductTemplate.bom` stores validated BOM configuration from the template contract.
- `MaterialRequirement` includes org/order/line-item/specification-snapshot ids, material id, source BOM item, planned quantity/unit/cost, readiness, criticality, and actual totals.
- Produces `calculateAndPersistRequirements`, `getOrderMaterialRequirements`, `supersedeRequirements`, and `recalculateRequirementsForSnapshot`.

- [ ] **Step 1: Add integration tests**

```ts
it('persists planned requirements with source BOM and snapshot provenance', async () => {
  const requirements = await calculateAndPersistRequirements({ orgId, lineItemId, snapshotId })
  expect(requirements[0]).toMatchObject({ snapshotId, plannedQuantity: 22, plannedCost: 44, actualQuantity: 0 })
})

it('supersedes old requirements instead of mutating them', async () => {
  const first = await calculateAndPersistRequirements(input)
  const second = await recalculateRequirementsForSnapshot({ ...input, snapshotId: nextSnapshotId })
  expect((await getOrderMaterialRequirements(orderId, orgId)).find((r) => r.id === first[0].id)?.status).toBe('superseded')
  expect(second[0].status).toBe('active')
})
```

- [ ] **Step 2: Run test and verify it fails**

Run: `bun run test -- src/features/materials/requirements-model.test.ts`
Expected: FAIL because schema/model functions do not exist.

- [ ] **Step 3: Extend template configuration and schema**

Store validated BOM JSON on `product_templates`; add org-scoped `material_requirements` keyed to order, line item, product template/source BOM, and specification snapshot. Add status (`active | superseded`), planned/actual fields, readiness metadata, and timestamps. Keep snapshots readable if a template is archived.

- [ ] **Step 4: Implement transactional calculation/persistence**

Load the product template, committed snapshot, and material rows under one org. Validate all references, calculate in memory, then transactionally supersede the prior active requirements and insert the new rows. Do not modify prior planned quantities/costs. Recalculation is required after accepted specification changes.

- [ ] **Step 5: Run focused integration tests and verify they pass**

Run: `bun run test -- src/features/materials/requirements-model.test.ts`
Expected: PASS for provenance, supersession, quantity/cost calculations, tenant isolation, and invalid source records.

- [ ] **Step 6: Commit requirements persistence**

```bash
git add src/db/schema.ts drizzle/0036_mto_bom_requirements.sql drizzle/meta src/features/product-templates/config.ts src/features/product-templates/model.ts src/features/materials/requirements-model.ts src/features/materials/requirements-model.test.ts
 git commit -m "feat: persist snapshot material requirements"
```

### Task 3: Reserve requirements and expose material readiness

**Files:**
- Modify: `src/features/materials/model.ts`
- Modify: `src/features/materials/requirements-model.ts`
- Create: `src/features/materials/readiness.ts`
- Create/modify: `src/features/materials/server.ts`, `src/features/materials/hooks.ts`
- Test: `src/features/materials/readiness.test.ts`, `src/features/materials/requirements-server.test.ts`

**Interfaces:**
- `getMaterialReadinessForOrder(orderId: string, orgId: string): Promise<MaterialReadinessSummary>`.
- `reserveRequirementsForOrder(orderId: string, orgId: string): Promise<ReservationResult>`.
- `releaseReservationsForOrder(orderId: string, orgId: string): Promise<void>`.
- `MaterialReadinessSummary` includes per-requirement on-hand/reserved/available/incoming/projected/shortage, criticality, readiness, and `canStartProduction`.

- [ ] **Step 1: Add readiness and transactional reservation tests**

```ts
it('blocks critical shortage and permits non-critical shortage', async () => {
  expect((await getMaterialReadinessForOrder(orderId, orgId)).canStartProduction).toBe(false)
  await markRequirementNonCritical(requirementId, orgId)
  expect((await getMaterialReadinessForOrder(orderId, orgId)).canStartProduction).toBe(true)
})

it('prevents two concurrent reservations from allocating shared stock twice', async () => {
  const results = await Promise.all([
    reserveRequirementsForOrder(orderA, orgId),
    reserveRequirementsForOrder(orderB, orgId),
  ])
  expect(results.filter((result) => result.ok)).toHaveLength(1)
})
```

- [ ] **Step 2: Run focused tests and verify they fail**

Run: `bun run test -- src/features/materials/readiness.test.ts src/features/materials/requirements-server.test.ts`
Expected: FAIL because readiness and requirement reservation functions do not exist.

- [ ] **Step 3: Implement readiness aggregation and reservation transaction**

Lock eligible material/reservation rows, calculate available quantities, allocate only sufficient requirements, and roll back the entire reservation batch on any critical shortfall. Mark partial/awaiting procurement/blocked states honestly; never fabricate incoming stock. Release reservations when requirements are superseded or orders are cancelled.

- [ ] **Step 4: Add server functions/hooks and run tests**

Expose GET readiness/requirements and POST calculate/reserve/release endpoints with authenticated org scope. Invalidate material, order, production, and portal queries after changes. Run:

```bash
bun run test -- src/features/materials/readiness.test.ts src/features/materials/requirements-server.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit readiness integration**

```bash
git add src/features/materials src/features/product-templates
 git commit -m "feat: reserve requirements and expose material readiness"
```

### Task 4: Add material readiness to production start

**Files:**
- Modify: `src/features/production/spawner.ts`
- Modify: `src/features/production/server.ts`
- Modify: `src/features/orders/components/use-order-derived-state.ts`
- Modify: `src/features/orders/pages/view-order-page.tsx`
- Modify: `src/features/production/components/task-detail-modal.tsx`
- Modify: `src/messages/types.ts`, `src/messages/en.ts`, `src/messages/id.ts`
- Test: `src/features/production/model.test.ts`, `src/features/orders/components/use-order-derived-state.test.ts`, `src/features/production/components/task-detail-modal.test.tsx`

**Interfaces:**
- `startProductionForOrder` keeps existing guards and adds `getMaterialReadinessForOrder`; it rejects only when a critical requirement is not ready.
- `OrderDerivedState.canStartProduction` includes specification and material readiness.
- Blocked errors identify `specification`, `payment`, `preProduction`, `materials`, or `stage` without leaking internal details.

- [ ] **Step 1: Add failing gate-combination tests**

```ts
it('blocks production when a critical material is short', async () => {
  await seedPaidApprovedOrderWithReadyTasks(orderId)
  await seedCriticalShortage(orderId)
  await expect(startProductionForOrder(orderId, orgId, actorId)).rejects.toThrow('critical material')
})

it('allows production with only a non-critical shortage', async () => {
  await seedPaidApprovedOrderWithReadyTasks(orderId)
  await seedNonCriticalShortage(orderId)
  await expect(startProductionForOrder(orderId, orgId, actorId)).resolves.toBeUndefined()
})
```

- [ ] **Step 2: Run targeted tests and verify they fail**

Run: `bun run test -- src/features/production/model.test.ts src/features/orders/components/use-order-derived-state.test.ts`
Expected: FAIL because production start has no material/specification gate.

- [ ] **Step 3: Implement additive readiness gate**

Require committed specification and active requirements for configurable products. Preserve the current paid-invoice, ready-task, active-stage, task-spawn, transaction, and activity behavior. Check material readiness before board transition and return a stable error reason for UI.

- [ ] **Step 4: Update client derived state and blocked UI**

Load readiness through query hooks; derive `canStartProduction` only when all four conditions are satisfied. Render translated blocked reasons and shortages in order/task detail; keep mobile layout usable and avoid a generic disabled button with no explanation.

- [ ] **Step 5: Run focused tests and typecheck**

```bash
bun run test -- src/features/production/model.test.ts src/features/orders/components/use-order-derived-state.test.ts src/features/orders/pages/view-order-page.test.tsx
bun run typecheck
```

Expected: PASS and no errors.

- [ ] **Step 6: Commit readiness gate**

```bash
git add src/features/production src/features/orders src/messages
 git commit -m "feat: gate production start on material readiness"
```

### Task 5: Add actual issue, consumption, return, waste, and planned-vs-actual costing

**Files:**
- Modify: `src/features/materials/model.ts`, `src/features/materials/server.ts`, `src/features/materials/hooks.ts`
- Create: `src/features/materials/usage-model.ts`
- Create: `src/features/materials/usage-summary.ts`
- Modify: `src/db/schema.ts` to add `orderId`, `taskId`, and `requirementId` references to the ledger; the implementation must use these explicit columns for every usage movement.
- Test: `src/features/materials/usage-model.test.ts`, `src/features/materials/usage-summary.test.ts`

**Interfaces:**
- `recordMaterialIssue`, `recordMaterialConsumption`, `recordMaterialReturn`, and `recordMaterialWaste` accept `orgId`, `requirementId`, quantity/unit, actor, and optional reason for waste.
- `getOrderMaterialCostSummary(orderId, orgId)` returns planned quantity/cost, issued, consumed, returned, wasted, variance, and actual cost per requirement/order.

- [ ] **Step 1: Write failing actual-usage tests**

```ts
it('reconciles issue, consume, return, and waste independently', async () => {
  await recordMaterialIssue(input({ quantity: 10 }))
  await recordMaterialConsumption(input({ quantity: 7 }))
  await recordMaterialReturn(input({ quantity: 2 }))
  await recordMaterialWaste(input({ quantity: 1, reason: 'cutting loss' }))
  expect(await getOrderMaterialCostSummary(orderId, orgId)).toMatchObject({ issued: 10, consumed: 7, returned: 2, wasted: 1 })
})
```

- [ ] **Step 2: Run focused tests and verify they fail**

Run: `bun run test -- src/features/materials/usage-model.test.ts src/features/materials/usage-summary.test.ts`
Expected: FAIL because usage operations do not exist.

- [ ] **Step 3: Implement movement-specific guards**

Issue can consume reserved stock only; consumption/return/waste must reference an issued requirement and cannot exceed the releasable/issued balance. Waste accepts an optional translated reason. Planned and actual values are never overwritten; derive variance from recorded movements and unit cost at movement time.

- [ ] **Step 4: Run tests and verify they pass**

Run: `bun run test -- src/features/materials/usage-model.test.ts src/features/materials/usage-summary.test.ts`
Expected: PASS for reconciliation, negative/over-release rejection, optional reason, and planned-vs-actual cost.

- [ ] **Step 5: Commit actual usage**

```bash
git add src/features/materials src/db/schema.ts
 git commit -m "feat: record material usage and cost variance"
```

### Task 6: Verify the complete material-readiness delivery

**Files:**
- Test: all BOM, requirements, materials, production, and order-derived-state tests touched above
- Test: `e2e/material-readiness.spec.ts`

**Interfaces:**
- No new API; proves product template → committed specification → BOM requirements → reservation → production gate → actual usage.

- [ ] **Step 1: Add the E2E smoke flow**

Create a product template with one material BOM, create a product/order and committed specification, show a critical shortage blocking production, receive stock, reserve it, start production, then record issue/consume/return/waste and inspect the cost summary. Use existing auth helpers and the safe E2E script.

- [ ] **Step 2: Run targeted tests**

```bash
bun run test -- src/features/materials src/features/product-templates src/features/specifications src/features/production/model.test.ts src/features/orders/components/use-order-derived-state.test.ts
bun run test:e2e -- e2e/material-readiness.spec.ts
```

Expected: PASS with existing payment/pre-production gates preserved.

- [ ] **Step 3: Run final checks**

```bash
bun run typecheck
bun run check
bun run build
```

Expected: PASS; migration journal and generated schemas are consistent.

- [ ] **Step 4: Commit verification adjustments**

```bash
git add src e2e drizzle
 git commit -m "test: verify BOM and material readiness delivery"
```
