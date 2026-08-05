# MTO Capacity Warnings and Job Costing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add lightweight capacity warnings and estimated-versus-actual job costing without implementing enterprise finite-capacity scheduling.

**Architecture:** Work centers and resource availability provide configurable warning thresholds, not hard scheduling locks. Job costing composes immutable order estimate inputs with actual material ledger, labor entries, subcontractor cost, overhead allocations, and shipping cost into an auditable margin summary. Calculations are pure and server-owned; UI presents conflicts/variance while the existing order and production state machines remain authoritative.

**Tech Stack:** TypeScript, Drizzle/PostgreSQL, TanStack Start server functions, Zod 4, TanStack Query, Recharts only where existing dashboard patterns require it, use-intl, Vitest/Playwright through Bun scripts.

## Global Constraints

- Depends on product templates, specifications, materials/BOM/usage, procurement, quality, and subcontractor costs from prior plans.
- Capacity warnings are advisory; no finite-capacity scheduler, machine telemetry, or automatic rescheduling.
- Estimates and actuals are separate; historical job-cost summaries do not mutate when configuration changes.
- Every record is org-scoped and every mutation is validated/authorized server-side.
- Cost data is currency-safe according to existing product/invoice conventions and localized in Indonesian/English.

---

### Task 1: Define pure capacity and costing contracts

**Files:**
- Create: `src/features/operations/capacity-types.ts`
- Create: `src/features/operations/capacity-calculator.ts`
- Create: `src/features/operations/job-costing-types.ts`
- Create: `src/features/operations/job-costing-calculator.ts`
- Test: `src/features/operations/capacity-calculator.test.ts`
- Test: `src/features/operations/job-costing-calculator.test.ts`

**Interfaces:**
- `CapacityWarning = { workCenterId; periodStart; periodEnd; plannedUnits; capacityUnits; severity: 'info' | 'warning' | 'critical' }`.
- `JobCostEstimate = { material; labor; subcontractor; overhead; shipping; total; margin; marginPercent }`.
- `calculateCapacityWarnings`, `calculateJobCostEstimate`, `calculateActualJobCost`, and `calculateVariance`.

- [ ] **Step 1: Write failing pure tests**

```ts
it('warns when overlapping planned work exceeds a work-center threshold', () => {
  expect(calculateCapacityWarnings({ capacityUnits: 10, plannedUnits: 12, thresholdPercent: 100 }))
    .toMatchObject({ severity: 'critical' })
})

it('separates estimated and actual costs and computes margin variance', () => {
  expect(calculateVariance({ estimated: { total: 100, margin: 40 }, actual: { total: 120, margin: 20 } }))
    .toEqual({ totalCostDelta: 20, marginDelta: -20 })
})
```

- [ ] **Step 2: Run and verify failure**

Run: `bun run test -- src/features/operations/capacity-calculator.test.ts src/features/operations/job-costing-calculator.test.ts`
Expected: FAIL because contracts/calculators are absent.

- [ ] **Step 3: Implement deterministic pure calculations**

Validate date ranges, non-negative capacities/costs, threshold bounds, revenue basis, and labor/subcontractor/overhead inputs. Return stable warning severity and explicit cost components; no DB or UI imports.

- [ ] **Step 4: Run and commit**

```bash
bun run test -- src/features/operations/capacity-calculator.test.ts src/features/operations/job-costing-calculator.test.ts
git add src/features/operations
git commit -m "feat: calculate capacity warnings and job cost variance"
```

### Task 2: Persist work centers, resource plans, and job-cost entries

**Files:**
- Modify: `src/db/schema.ts`
- Create via Drizzle: `drizzle/0041_mto_capacity_job_costing.sql`
- Modify via generation: `drizzle/meta/_journal.json` and snapshot metadata
- Create: `src/features/operations/model.ts`
- Test: `src/features/operations/model.test.ts`

**Interfaces:**
- `createWorkCenter`, `updateWorkCenter`, `createResourcePlan`, `listCapacityWarnings`, `createJobCostEstimate`, `recordLaborCost`, `recordOverheadCost`, `getJobCostSummary`.

- [ ] **Step 1: Write DB integration tests**

```ts
it('stores estimated and actual job-cost components independently', async () => {
  const estimate = await createJobCostEstimate({ orgId, orderId, components: estimatedComponents })
  await recordLaborCost({ orgId, orderId, amount: 50, actorId })
  expect(await getJobCostSummary(orderId, orgId)).toMatchObject({ estimated: estimatedComponents, actual: { labor: 50 } })
})

it('isolates capacity and cost rows between organizations', async () => {
  expect(await listCapacityWarnings(org2Id, period)).toEqual([])
})
```

- [ ] **Step 2: Run and verify failure**

Run: `bun run test -- src/features/operations/model.test.ts`
Expected: FAIL because schema/model are absent.

- [ ] **Step 3: Add schema and migration**

Add org-scoped `work_centers`, `resource_plans`, `job_cost_estimates`, and `job_cost_entries` with order/task references, cost type (`material | labor | subcontractor | overhead | shipping`), amount/currency, source movement/handoff references, actor, and timestamps. Add immutable estimate snapshot JSON and unique source-entry identities.

- [ ] **Step 4: Implement model transactions and summaries**

Validate referenced order/task/org relationships, store estimate at the relevant order/specification version, import actual material/subcontractor totals by explicit references, and keep labor/overhead entries append-only. Capacity queries calculate advisory warnings from overlapping plan rows.

- [ ] **Step 5: Run tests and commit**

```bash
bun run test -- src/features/operations/model.test.ts
git add src/db/schema.ts drizzle/0041_mto_capacity_job_costing.sql drizzle/meta src/features/operations
git commit -m "feat: persist capacity plans and job costs"
```

### Task 3: Expose operations and reporting UI

**Files:**
- Create: `src/features/operations/server.ts`, `src/features/operations/hooks.ts`
- Create: `src/features/operations/pages/capacity-page.tsx`
- Create: `src/features/operations/pages/job-cost-page.tsx`
- Create: `src/features/operations/components/cost-summary.tsx`
- Modify: `src/features/orders/pages/view-order-page.tsx`, dashboard route/components
- Modify: `src/lib/query-keys.ts`, permissions, messages
- Test: co-located server/component/order/dashboard tests

**Interfaces:**
- Functions: `listCapacityWarningsFn`, `createResourcePlanFn`, `getJobCostSummaryFn`, `recordLaborCostFn`, `recordOverheadCostFn`.
- Hooks invalidate operations/order/dashboard keys.

- [ ] **Step 1: Write failing UI tests**

```tsx
expect(screen.getByText('operations.marginVariance')).toBeVisible()
expect(screen.getByText('operations.capacityWarning')).toBeVisible()
```

- [ ] **Step 2: Implement validated server functions/hooks**

Use server-side org/role resolution and Zod validation; owner/admin manage resource plans and cost entries, members/operators see only authorized task/order cost context.

- [ ] **Step 3: Build responsive cost/capacity views**

Show estimated vs actual material/labor/subcontractor/overhead/shipping, total variance, margin, and advisory capacity conflicts. Keep the order detail view focused by composing a summary section rather than replacing existing invoice/production sections.

- [ ] **Step 4: Run tests and commit**

```bash
bun run test -- src/features/operations src/features/orders/pages/view-order-page.test.tsx
bun run typecheck
git add src/features/operations src/features/orders src/features/dashboard src/lib/query-keys.ts src/features/permissions src/messages
git commit -m "feat: add capacity and job cost reporting"
```

### Task 4: Verify capacity and costing delivery

**Files:**
- Test: `e2e/capacity-job-costing.spec.ts`
- Test: all operations/material/subcontractor/order tests

- [ ] **Step 1: Run E2E flow**

Create work-center plans that exceed capacity, verify an advisory warning without a hard state transition, record estimated/actual components, and verify order-level variance/margin summary.

Run: `bun run test:e2e -- e2e/capacity-job-costing.spec.ts`

- [ ] **Step 2: Run final checks**

```bash
bun run test -- src/features/operations src/features/materials src/features/subcontractors
bun run typecheck
bun run check
bun run build
```

- [ ] **Step 3: Commit verification**

```bash
git add src e2e drizzle
git commit -m "test: verify capacity and job costing delivery"
```
