# MTO Quality Issues and Rework Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace hidden defect/rework notes with structured quality issues, evidence, corrective actions, and measurable rework outcomes.

**Architecture:** Quality issues attach to a production task/order line and carry controlled defect type, quantity, evidence, root cause, corrective action, owner, status, and timestamps. Rework is a linked task action with explicit quantity and material/labor impact; it never silently rewrites the original task or customer snapshot. Existing stage/task approvals remain separate, while quality status can block completion through an explicit configured rule.

**Tech Stack:** TypeScript, Drizzle/PostgreSQL, TanStack Start server functions, Zod 4, R2 asset helpers, TanStack Query, use-intl, React Testing Library, Vitest/Playwright through Bun scripts.

## Global Constraints

- Depends on production tasks, immutable specification snapshots, material usage, and existing asset upload contracts.
- Defect types and statuses are closed validated data; no category-specific logic.
- Quality records are organization-scoped and append-only enough to preserve evidence/history.
- Rework must be explicit and auditable; original planned/actual usage is not overwritten.
- Customer proof approval remains distinct from internal quality/stage approval.
- Use localized copy, server-side validation/authorization, and safe Bun test commands.

---

### Task 1: Define quality and rework contracts

**Files:**
- Create: `src/features/quality/types.ts`
- Create: `src/features/quality/validation.ts`
- Test: `src/features/quality/validation.test.ts`

**Interfaces:**
- `DefectType = 'dimension' | 'appearance' | 'function' | 'material' | 'print' | 'finish' | 'damage' | 'other'`.
- `QualityStatus = 'open' | 'under_review' | 'rework_required' | 'accepted' | 'rejected' | 'closed'`.
- `QualityIssueInput = { taskId; lineItemId; defectType; quantity; evidenceAssetIds; rootCause?; correctiveAction?; status }`.
- `validateQualityIssue`, `validateReworkAction`, `canCloseQualityIssue`.

- [ ] **Step 1: Write failing tests**

```ts
it('requires positive defect quantity and evidence for visual defects', () => {
  expect(() => validateQualityIssue({ defectType: 'appearance', quantity: 0, evidenceAssetIds: [] })).toThrow()
})

it('does not close an issue while required corrective action is missing', () => {
  expect(canCloseQualityIssue({ status: 'accepted', correctiveAction: null })).toBe(false)
})
```

- [ ] **Step 2: Run and verify failure**

Run: `bun run test -- src/features/quality/validation.test.ts`
Expected: FAIL because the module is absent.

- [ ] **Step 3: Implement validation/state transition helpers**

Require evidence where configured, positive quantities no greater than task/line quantity, bounded text, known status transitions, and explicit corrective action before close. Keep the helpers pure.

- [ ] **Step 4: Run and commit**

```bash
bun run test -- src/features/quality/validation.test.ts
git add src/features/quality
git commit -m "feat: define structured quality issue contracts"
```

### Task 2: Persist quality issues and rework actions

**Files:**
- Modify: `src/db/schema.ts`
- Create via Drizzle: `drizzle/0039_mto_quality_rework.sql`
- Modify via generation: `drizzle/meta/_journal.json` and snapshot metadata
- Create: `src/features/quality/model.ts`
- Test: `src/features/quality/model.test.ts`

**Interfaces:**
- `createQualityIssue`, `updateQualityIssue`, `recordQualityDecision`, `createReworkAction`, `completeReworkAction`, `listQualityIssues`, and `getQualityIssue`.

- [ ] **Step 1: Write DB integration tests**

```ts
it('keeps defect evidence and rework linked to one task without changing its snapshot', async () => {
  const issue = await createQualityIssue({ orgId, taskId, lineItemId, defectType: 'dimension', quantity: 1, evidenceAssetIds: [assetId] })
  const rework = await createReworkAction({ orgId, issueId: issue.id, quantity: 1, notes: 'Resize' })
  await completeReworkAction({ orgId, reworkId: rework.id, actualMaterialQuantity: 2 })
  expect((await getTask(taskId, orgId)).context?.snapshotId).toBe(snapshotId)
  expect((await getQualityIssue(issue.id, orgId)).status).toBe('closed')
})
```

- [ ] **Step 2: Run and verify failure**

Run: `bun run test -- src/features/quality/model.test.ts`
Expected: FAIL because schema/model are absent.

- [ ] **Step 3: Add schema/migration and model**

Add org-scoped `quality_issues` and `rework_actions` with task/order/line-item/snapshot references, defect data, evidence JSON/asset ids, root cause, corrective action, actor/status/timestamps, and actual material/labor cost fields. Use transactions for issue decision + rework completion and preserve all history.

- [ ] **Step 4: Run tests and commit**

```bash
bun run test -- src/features/quality/model.test.ts
git add src/db/schema.ts drizzle/0039_mto_quality_rework.sql drizzle/meta src/features/quality
git commit -m "feat: persist quality issues and rework"
```

### Task 3: Expose quality workflow and operator/admin UI

**Files:**
- Create: `src/features/quality/server.ts`, `src/features/quality/hooks.ts`
- Create: `src/features/quality/components/quality-issue-form.tsx`
- Create: `src/features/quality/components/quality-issue-card.tsx`
- Modify: `src/features/production/components/task-detail-modal.tsx`
- Modify: `src/features/production/pages/three-column-page.tsx`
- Modify: `src/messages/types.ts`, `src/messages/en.ts`, `src/messages/id.ts`
- Test: co-located server/component/task-detail tests

**Interfaces:**
- Server functions: `listQualityIssuesFn`, `createQualityIssueFn`, `recordQualityDecisionFn`, `createReworkActionFn`, `completeReworkActionFn`.
- Hooks invalidate production/task/material/order cost queries.

- [ ] **Step 1: Add failing UI/permission tests**

```tsx
expect(screen.getByRole('button', { name: 'quality.reportIssue' })).toBeVisible()
expect(screen.getByText('quality.reworkRequired')).toBeVisible()
```

- [ ] **Step 2: Implement validated server functions and hooks**

Resolve org and role server-side; permit operators to report issues and admins to decide/close; validate task ownership and snapshot references; return explicit errors.

- [ ] **Step 3: Implement accessible task-detail UI**

Use existing task detail layout and asset upload patterns. Show issue count/status, evidence, root cause/corrective action, rework state, and a clear completion block when open/rework-required issues remain.

- [ ] **Step 4: Run tests and commit**

```bash
bun run test -- src/features/quality src/features/production/components/task-detail-modal.test.tsx
bun run typecheck
git add src/features/quality src/features/production src/messages
git commit -m "feat: add operator quality workflow"
```

### Task 4: Verify quality delivery

**Files:**
- Test: `e2e/quality-rework.spec.ts`
- Test: all quality/production/material tests

- [ ] **Step 1: Run E2E flow**

Report a defect with evidence, assign rework, complete it with actual usage, accept/close the issue, and verify the task can complete only after the quality gate is satisfied.

Run: `bun run test:e2e -- e2e/quality-rework.spec.ts`

- [ ] **Step 2: Run final checks**

```bash
bun run test -- src/features/quality src/features/production
bun run typecheck
bun run check
bun run build
```

- [ ] **Step 3: Commit verification**

```bash
git add src e2e drizzle
git commit -m "test: verify quality and rework delivery"
```
