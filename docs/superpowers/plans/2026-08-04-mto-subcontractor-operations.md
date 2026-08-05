# MTO Subcontractor Handoffs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Track outsourced production handoffs, expected returns, received results, QC, and vendor cost as part of the same order/task backbone.

**Architecture:** A subcontractor handoff is a bounded child workflow of a production task, not a second order lifecycle. It records vendor, quantities, issued/expected/received dates, outgoing material references, returned results, QC outcome, cost, evidence, and status. The original task remains the production source of truth; handoffs add auditable external responsibility and can block task completion when configured.

**Tech Stack:** TypeScript, Drizzle/PostgreSQL, TanStack Start server functions, Zod 4, TanStack Query, existing assets and production task UI, use-intl, Vitest/Playwright through Bun scripts.

## Global Constraints

- Depends on production tasks, material ledger/usage, procurement/receiving, and quality issue contracts.
- Status transitions are explicit and validated; handoffs never silently mark production complete.
- All data is org-scoped and tenant/role authorization is server-side.
- Vendor cost and received QC are structured fields; no free-text-only operational state.
- Use existing production surfaces and localized Indonesian/English copy.

---

### Task 1: Define subcontractor contracts and state transitions

**Files:**
- Create: `src/features/subcontractors/types.ts`
- Create: `src/features/subcontractors/validation.ts`
- Test: `src/features/subcontractors/validation.test.ts`

**Interfaces:**
- `SubcontractorHandoffStatus = 'draft' | 'sent' | 'in_progress' | 'returned' | 'under_qc' | 'accepted' | 'rejected' | 'cancelled'`.
- `SubcontractorHandoff = { id; orgId; taskId; vendorName; quantity; materialIssueIds; sentAt; expectedReturnAt; returnedAt; receivedQuantity; vendorCost; qcStatus; evidenceAssetIds; notes }`.
- `allowedHandoffTransition(from, to)` and `validateHandoffInput`.

- [ ] **Step 1: Write failing tests**

```ts
it('does not allow returned before sent', () => {
  expect(allowedHandoffTransition('draft', 'returned')).toBe(false)
})

it('rejects received quantity above sent quantity and negative vendor cost', () => {
  expect(() => validateHandoffInput({ quantity: 5, receivedQuantity: 6, vendorCost: -1 })).toThrow()
})
```

- [ ] **Step 2: Run and verify failure**

Run: `bun run test -- src/features/subcontractors/validation.test.ts`
Expected: FAIL because contracts are absent.

- [ ] **Step 3: Implement pure validation/state helpers**

Require task/vendor/quantity, expected-return date, non-negative cost, received quantity bounds, and QC before acceptance. Keep all transition rules explicit.

- [ ] **Step 4: Run and commit**

```bash
bun run test -- src/features/subcontractors/validation.test.ts
git add src/features/subcontractors
git commit -m "feat: define subcontractor handoff contract"
```

### Task 2: Persist handoffs and vendor results

**Files:**
- Modify: `src/db/schema.ts`
- Create via Drizzle: `drizzle/0040_mto_subcontractor_handoffs.sql`
- Modify via generation: `drizzle/meta/_journal.json` and snapshot metadata
- Create: `src/features/subcontractors/model.ts`
- Test: `src/features/subcontractors/model.test.ts`

**Interfaces:**
- `createHandoff`, `sendHandoff`, `recordReturn`, `recordQcResult`, `acceptHandoff`, `rejectHandoff`, `cancelHandoff`, `listHandoffs`, and `getHandoff`.

- [ ] **Step 1: Write DB integration test**

```ts
it('tracks issued handoff, return, QC, and vendor cost without changing source task snapshot', async () => {
  const handoff = await createHandoff({ orgId, taskId, vendorName: 'Vendor', quantity: 3, expectedReturnAt })
  await sendHandoff(handoff.id, orgId, actorId)
  await recordReturn({ orgId, handoffId: handoff.id, receivedQuantity: 3, vendorCost: 100 })
  await recordQcResult({ orgId, handoffId: handoff.id, outcome: 'accepted', notes: 'Pass' })
  expect((await getHandoff(handoff.id, orgId)).status).toBe('accepted')
  expect((await getTask(taskId, orgId)).context?.snapshotId).toBe(snapshotId)
})
```

- [ ] **Step 2: Run and verify failure**

Run: `bun run test -- src/features/subcontractors/model.test.ts`
Expected: FAIL because schema/model are absent.

- [ ] **Step 3: Add schema/migration/model**

Add org-scoped handoff table with production task/order/line-item/snapshot references, vendor data, quantities/dates, material issue references, cost, QC status, evidence, actor/status/timestamps. Use transactions for return/QC/acceptance and add material return/usage movements through the existing service.

- [ ] **Step 4: Run tests and commit**

```bash
bun run test -- src/features/subcontractors/model.test.ts
git add src/db/schema.ts drizzle/0040_mto_subcontractor_handoffs.sql drizzle/meta src/features/subcontractors
git commit -m "feat: persist subcontractor handoffs"
```

### Task 3: Expose handoffs and integrate task UI

**Files:**
- Create: `src/features/subcontractors/server.ts`, `src/features/subcontractors/hooks.ts`
- Create: `src/features/subcontractors/components/handoff-form.tsx`
- Create: `src/features/subcontractors/components/handoff-card.tsx`
- Modify: `src/features/production/components/task-detail-modal.tsx`
- Modify: `src/lib/query-keys.ts`, permissions, messages
- Test: co-located server/component/task tests

**Interfaces:**
- Functions: `listHandoffsFn`, `createHandoffFn`, `sendHandoffFn`, `recordReturnFn`, `recordQcResultFn`, `acceptHandoffFn`, `rejectHandoffFn`.
- Hooks invalidate production/material/quality/cost queries.

- [ ] **Step 1: Write failing UI tests**

```tsx
expect(screen.getByText('subcontractors.expectedReturn')).toBeVisible()
expect(screen.getByRole('button', { name: 'subcontractors.recordQc' })).toBeVisible()
```

- [ ] **Step 2: Implement validated server functions/hooks**

Resolve org and role server-side, enforce task ownership and status transitions, validate vendor costs/quantities, and return explicit mutation errors.

- [ ] **Step 3: Implement responsive localized task-detail UI**

Show active handoff, expected return, received/QC state, evidence, cost, and a completion block for unresolved handoffs. Keep operator controls focused and accessible.

- [ ] **Step 4: Run tests and commit**

```bash
bun run test -- src/features/subcontractors src/features/production/components/task-detail-modal.test.tsx
bun run typecheck
git add src/features/subcontractors src/features/production src/lib/query-keys.ts src/features/permissions src/messages
git commit -m "feat: manage subcontractor handoffs"
```

### Task 4: Verify subcontractor delivery

**Files:**
- Test: `e2e/subcontractor-handoff.spec.ts`
- Test: all subcontractor/production/material/quality tests

- [ ] **Step 1: Run E2E flow**

Create and send a handoff, record partial return, record QC rejection, correct/re-receive it, accept, and verify vendor cost plus task completion readiness.

Run: `bun run test:e2e -- e2e/subcontractor-handoff.spec.ts`

- [ ] **Step 2: Run final checks**

```bash
bun run test -- src/features/subcontractors src/features/production
bun run typecheck
bun run check
bun run build
```

- [ ] **Step 3: Commit verification**

```bash
git add src e2e drizzle
git commit -m "test: verify subcontractor handoff delivery"
```
