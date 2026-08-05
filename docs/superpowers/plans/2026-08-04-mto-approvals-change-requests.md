# MTO Customer Proof Approvals and Change Requests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add distinct customer proof approval and auditable post-confirmation change requests without mutating historical specification snapshots.

**Architecture:** Proofs are first-class customer-facing approval records associated with a production/task output and its evidence assets; internal stage approval remains separate. Change requests are versioned records with requested changes, impact analysis, reprice/deadline/BOM effects, dual admin/customer decisions, and a resulting specification snapshot. Acceptance recalculates requirements/reservations while retaining every prior snapshot and decision.

**Tech Stack:** TypeScript, Drizzle ORM/PostgreSQL, TanStack Start server functions, Zod 4, existing assets/R2 upload APIs, TanStack Query, React Testing Library, use-intl, Vitest/Playwright through Bun scripts.

## Global Constraints

- Depends on immutable specification snapshots and material requirement/reservation contracts from prior plans.
- Customer approval is distinct from internal production-stage approval; neither status is reused as the other.
- A rejected proof blocks the configured transition until a replacement proof is approved.
- A committed specification is never overwritten. Every accepted change creates a new snapshot version and supersedes/recalculates active requirements and reservations.
- Change-request impact data is structured JSON validated against explicit fields; no arbitrary executable formulas.
- Portal operations are scoped by the order token; internal operations resolve organization/session and role server-side.
- Every new record is organization-scoped, every mutation has runtime validation, and all copy is localized in Indonesian/English.

---

### Task 1: Define proof and change-request state contracts

**Files:**
- Create: `src/features/approvals/types.ts`
- Create: `src/features/approvals/validation.ts`
- Test: `src/features/approvals/validation.test.ts`

**Interfaces:**
- `ProofStatus = 'pending_customer' | 'approved' | 'rejected' | 'superseded'`.
- `Proof = { id; orgId; orderId; lineItemId; taskId; version; status; assetIds; notes; submittedBy; customerDecidedAt; customerDecisionNote; createdAt }`.
- `ChangeRequestStatus = 'requested' | 'under_review' | 'awaiting_customer' | 'approved' | 'rejected' | 'cancelled'`.
- `ChangeRequestImpact = { priceDelta; newTotal; deadline; bomChanged; materialDelta; reservationAction; productionImpact; notes }`.
- `validateProofInput`, `validateCustomerDecision`, `validateChangeRequestInput`, and `validateImpactAnalysis`.

- [ ] **Step 1: Write failing contract tests**

```ts
it('requires at least one proof asset and a non-empty submission note when configured', () => {
  expect(() => validateProofInput({ assetIds: [], notes: '' })).toThrow()
})

it('rejects an impact analysis with negative deadline or unvalidated reservation action', () => {
  expect(() => validateImpactAnalysis({ priceDelta: 0, deadline: 'not-a-date', reservationAction: 'invented' })).toThrow()
})
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `bun run test -- src/features/approvals/validation.test.ts`
Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement closed state/input schemas**

Require evidence files for proof submission, bounded notes, customer decision values (`approve | reject`), change categories (`artwork | size | material | quantity | deadline | finishing | other`), explicit price/deadline/BOM/material/production impact fields, and status transition guards.

- [ ] **Step 4: Run focused test and verify it passes**

Run: `bun run test -- src/features/approvals/validation.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit contracts**

```bash
git add src/features/approvals/types.ts src/features/approvals/validation.ts src/features/approvals/validation.test.ts
git commit -m "feat: define proof and change request contracts"
```

### Task 2: Persist proofs and versioned change requests

**Files:**
- Modify: `src/db/schema.ts`
- Create via Drizzle: `drizzle/0037_mto_approvals_changes.sql`
- Modify via generation: `drizzle/meta/_journal.json` and snapshot metadata
- Create: `src/features/approvals/model.ts`
- Test: `src/features/approvals/model.test.ts`

**Interfaces:**
- `submitProof`, `listProofs`, `getActiveProof`, `decideProof`, `supersedeProof`.
- `createChangeRequest`, `getChangeRequest`, `listChangeRequests`, `recordImpactAnalysis`, `recordAdminDecision`, `recordCustomerDecision`, `applyApprovedChange`.

- [ ] **Step 1: Write DB integration tests**

```ts
it('stores customer proof decision independently from internal stage approval', async () => {
  const proof = await submitProof({ orgId, taskId, assetIds: [assetId], notes: 'Ready' })
  expect((await decideProof({ orgId, proofId: proof.id, decision: 'approve' })).status).toBe('approved')
  expect((await getStageTask(taskId, orgId)).status).not.toBe('approved')
})

it('applies an accepted change as a new snapshot and retains the prior version', async () => {
  const request = await createChangeRequest({ orgId, lineItemId, requestedChanges })
  await recordImpactAnalysis({ orgId, changeRequestId: request.id, impact })
  await recordAdminDecision({ orgId, changeRequestId: request.id, decision: 'approve' })
  await recordCustomerDecision({ orgId, changeRequestId: request.id, decision: 'approve' })
  const result = await applyApprovedChange({ orgId, changeRequestId: request.id })
  expect(result.newSnapshot.version).toBe(oldSnapshot.version + 1)
  expect(await listSpecificationVersions(lineItemId, orgId)).toHaveLength(2)
})
```

- [ ] **Step 2: Run the integration tests and verify they fail**

Run: `bun run test -- src/features/approvals/model.test.ts`
Expected: FAIL because tables and model functions do not exist.

- [ ] **Step 3: Add schema and migration**

Add org-scoped `proofs` and `proof_decisions`/decision columns with task/line-item/order references, version, status, evidence asset ids, notes, submitter, and customer decision metadata. Add org-scoped `change_requests` with current snapshot id, requested changes, impact, repricing/deadline/BOM/material fields, admin/customer decisions, actor/timestamps, and resulting snapshot id. Preserve rows on historical order/specification references using restrictive/set-null behavior that does not erase audit history.

- [ ] **Step 4: Implement state transitions and transaction boundaries**

Proof submission creates pending version; customer approve/reject transitions only pending and logs the decision. `applyApprovedChange` requires both approved decisions, creates a new immutable snapshot through the specification model, supersedes prior requirements/reservations through material services, and marks the request applied in one transaction. Reject duplicate application and stale request versions.

- [ ] **Step 5: Run integration tests and verify they pass**

Run: `bun run test -- src/features/approvals/model.test.ts`
Expected: PASS for independent approval state, dual-decision gating, immutable snapshots, tenant isolation, and recalculation provenance.

- [ ] **Step 6: Commit persistence/model**

```bash
git add src/db/schema.ts drizzle/0037_mto_approvals_changes.sql drizzle/meta src/features/approvals/model.ts src/features/approvals/model.test.ts
 git commit -m "feat: persist customer proofs and change requests"
```

### Task 3: Add authenticated and portal-scoped server functions/hooks

**Files:**
- Create: `src/features/approvals/server.ts`
- Create: `src/features/approvals/hooks.ts`
- Modify: `src/lib/query-keys.ts`
- Modify: `src/features/permissions/model.ts`
- Test: `src/features/approvals/server.test.ts`, `src/features/approvals/hooks.test.ts`

**Interfaces:**
- Server functions: `submitProofFn`, `getProofFn`, `listProofsFn`, `decideProofFn`, `createChangeRequestFn`, `getChangeRequestFn`, `listChangeRequestsFn`, `recordImpactAnalysisFn`, `recordAdminDecisionFn`, `recordCustomerDecisionFn`, and `applyApprovedChangeFn`.
- Portal functions: `getPortalProofFn`, `decidePortalProofFn`, `createPortalChangeRequestFn`, `getPortalChangeRequestFn`, and `decidePortalChangeRequestFn`.
- Hooks expose corresponding authenticated and portal operations.

- [ ] **Step 1: Write scope/permission tests**

```ts
it('cannot decide a proof belonging to another order through a portal token', async () => {
  await expect(decidePortalProofFn({ data: { token, proofId: otherProofId, decision: 'approve' } }))
    .resolves.toEqual({ ok: false, error: 'notFound' })
})

it('rejects customer-request creation from an internal member lacking the configured permission', async () => {
  expect((await createChangeRequestFn({ data: { lineItemId, requestedChanges } })).ok).toBe(false)
})
```

- [ ] **Step 2: Run focused tests and verify they fail**

Run: `bun run test -- src/features/approvals/server.test.ts src/features/approvals/hooks.test.ts`
Expected: FAIL because server functions/hooks do not exist.

- [ ] **Step 3: Implement runtime validation, token scope, and role guards**

Use Zod validators, `resolveOrgId()` for internal calls, and token-to-order resolution for portal calls. Never trust client org/order/line-item ids without verifying their relationship. Return explicit typed errors and invalidate approval, specification, material, order, production, and portal keys after accepted decisions.

- [ ] **Step 4: Run focused tests and verify they pass**

Run: `bun run test -- src/features/approvals/server.test.ts src/features/approvals/hooks.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit server/hooks**

```bash
git add src/features/approvals/server.ts src/features/approvals/hooks.ts src/lib/query-keys.ts src/features/permissions/model.ts src/features/approvals/server.test.ts src/features/approvals/hooks.test.ts
 git commit -m "feat: expose scoped proof and change workflows"
```

### Task 4: Build customer proof and change-request UI

**Files:**
- Create: `src/features/approvals/components/proof-submission-form.tsx`
- Create: `src/features/approvals/components/proof-decision-card.tsx`
- Create: `src/features/approvals/components/change-request-form.tsx`
- Create: `src/features/approvals/components/change-request-review.tsx`
- Modify: `src/features/portal/pages/progress-view.tsx`, `src/features/portal/pages/portal-page.tsx`
- Modify: `src/features/orders/pages/view-order-page.tsx`
- Modify: `src/features/production/components/review-modal.tsx` to reuse only its modal layout primitives; proof status and customer decisions remain in the new approvals components.
- Modify: `src/messages/types.ts`, `src/messages/en.ts`, `src/messages/id.ts`
- Test: `src/features/approvals/components/proof-decision-card.test.tsx`, `src/features/approvals/components/change-request-review.test.tsx`, portal/order integration tests

**Interfaces:**
- Customer proof UI consumes portal hooks and offers explicit approve/reject with explanation.
- Internal review consumes authenticated hooks and shows impact/reprice/deadline/BOM/material effects before admin decision.
- The active task shows current snapshot version and blocks stale proof/change actions.

- [ ] **Step 1: Write failing UI tests**

```tsx
it('shows proof evidence and disables approval while files are missing', () => {
  render(<ProofDecisionCard proof={{ ...pendingProof, assetIds: [] }} />)
  expect(screen.getByRole('button', { name: 'approvals.approve' })).toBeDisabled()
  expect(screen.getByRole('alert')).toHaveTextContent('approvals.evidenceRequired')
})

it('shows change impact before enabling admin acceptance', () => {
  render(<ChangeRequestReview impact={impact} />)
  expect(screen.getByText('approvals.priceImpact')).toBeVisible()
  expect(screen.getByText('approvals.deadlineImpact')).toBeVisible()
  expect(screen.getByText('approvals.materialImpact')).toBeVisible()
})
```

- [ ] **Step 2: Run focused tests and verify they fail**

Run: `bun run test -- src/features/approvals/components/proof-decision-card.test.tsx src/features/approvals/components/change-request-review.test.tsx`
Expected: FAIL because components and messages do not exist.

- [ ] **Step 3: Implement accessible customer/admin surfaces**

Use existing upload/R2 adapters, `FileListUpload`, `ReviewModal` conventions, translated labels, `role="alert"`, `aria-live`, disabled controls during mutation, and explicit pending/approved/rejected/blocked states. Customer rejection requires an explanation; admin review displays price, deadline, BOM, reservation, and production effects.

- [ ] **Step 4: Wire portal timeline and internal task context**

Add proof pending/approved/rejected and change-request milestones without removing existing order progress, invoice, payment, shipment, or contact UI. Display the active specification snapshot version on tasks and mark stale instructions visibly.

- [ ] **Step 5: Run focused tests and verify they pass**

Run: `bun run test -- src/features/approvals/components/proof-decision-card.test.tsx src/features/approvals/components/change-request-review.test.tsx src/features/portal/pages/progress-view.test.tsx src/features/orders/pages/view-order-page.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit UI integration**

```bash
git add src/features/approvals src/features/portal src/features/orders/pages/view-order-page.tsx src/messages
 git commit -m "feat: add customer proof and change request UI"
```

### Task 5: Verify approvals and post-confirmation exceptions

**Files:**
- Test: `e2e/proof-approval-change-request.spec.ts`
- Test: all approvals, specification, materials, portal, order, and production tests touched above

**Interfaces:**
- No new API; proves proof approval and accepted changes end to end.

- [ ] **Step 1: Add the E2E flow**

Create a proof, expose it through the scoped portal, reject it with an explanation, replace it, approve it, request a post-confirmation quantity/material change, show impact/reprice, reject once, then approve both admin/customer decisions and verify a new active snapshot/version with recalculated material requirements. Use existing auth helpers and no E2E database truncation.

- [ ] **Step 2: Run targeted verification**

```bash
bun run test -- src/features/approvals src/features/specifications src/features/materials src/features/portal src/features/production
bun run test:e2e -- e2e/proof-approval-change-request.spec.ts
```

Expected: PASS; prior committed snapshot remains readable and active task points to new version.

- [ ] **Step 3: Run type, check, and build gates**

```bash
bun run typecheck
bun run check
bun run build
```

Expected: PASS.

- [ ] **Step 4: Commit verification changes**

```bash
git add src e2e drizzle
 git commit -m "test: verify proof and change workflows"
```
