# MTO Procurement Requests and Receiving Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn material shortages into reviewed purchase requests and record receiving/inspection outcomes without treating unverified stock as production-ready.

**Architecture:** Procurement remains admin-reviewed rather than automatic. A shortage can produce a draft purchase request with material, quantity, requirement provenance, supplier context, and need-by date; only an authorized admin can approve, order, cancel, or partially receive it. Receiving posts ledger receipts only for accepted quantities, while inspection/quarantine state prevents rejected or pending material from inflating available production stock.

**Tech Stack:** TypeScript, Drizzle/PostgreSQL, TanStack Start server functions, Zod 4, TanStack Query, DataTable/Form primitives, use-intl, Vitest/Playwright through Bun scripts.

## Global Constraints

- Depends on product templates, specification snapshots, BOM requirements, and material ledger/reservation contracts from earlier plans.
- Automatic supplier purchasing, full purchase-order lifecycle, supplier scorecards, and complex quarantine workflows remain out of scope; this plan implements reviewed requests and receiving only.
- Every row is organization-scoped; all server functions resolve organization and role from authenticated session.
- Receipts must not silently make rejected/pending material available; accepted quantities post auditable ledger movements.
- User-facing copy is localized in Indonesian/English; mutations use runtime validation and discriminated results.

---

### Task 1: Define procurement and receiving contracts

**Files:**
- Create: `src/features/procurement/types.ts`
- Create: `src/features/procurement/validation.ts`
- Test: `src/features/procurement/validation.test.ts`

**Interfaces:**
- `PurchaseRequestStatus = 'draft' | 'submitted' | 'approved' | 'ordered' | 'partially_received' | 'received' | 'rejected' | 'cancelled'`.
- `PurchaseRequestLine = { materialId; requirementId?; quantity; unit; estimatedUnitCost; needBy; supplierReference? }`.
- `ReceivingStatus = 'pending_inspection' | 'accepted' | 'rejected' | 'partially_accepted'`.
- `validatePurchaseRequestInput`, `validateReceivingInput`.

- [ ] **Step 1: Write failing transition/input tests**

```ts
it('rejects purchase lines with non-positive quantity or unknown unit', () => {
  expect(() => validatePurchaseRequestInput({ lines: [{ materialId: 'm', quantity: 0, unit: 'unknown' }] })).toThrow()
})

it('does not accept more than the outstanding request quantity', () => {
  expect(() => validateReceivingInput({ requestLineId: 'l', acceptedQuantity: 11, orderedQuantity: 10 })).toThrow()
})
```

- [ ] **Step 2: Run focused tests and verify they fail**

Run: `bun run test -- src/features/procurement/validation.test.ts`
Expected: FAIL because contracts do not exist.

- [ ] **Step 3: Implement explicit validation and transition guards**

Require material/unit compatibility, positive quantities, valid dates, bounded costs, and receiving quantities no greater than outstanding. Define allowed status transitions in a pure function so model and UI share the same contract.

- [ ] **Step 4: Run test and commit**

```bash
bun run test -- src/features/procurement/validation.test.ts
git add src/features/procurement
git commit -m "feat: define reviewed procurement contracts"
```

### Task 2: Persist requests, lines, receiving, and inspection outcomes

**Files:**
- Modify: `src/db/schema.ts`
- Create via Drizzle: `drizzle/0038_mto_procurement_receiving.sql`
- Modify via generation: `drizzle/meta/_journal.json` and snapshot metadata
- Create: `src/features/procurement/model.ts`
- Test: `src/features/procurement/model.test.ts`

**Interfaces:**
- `createPurchaseRequest`, `submitPurchaseRequest`, `approvePurchaseRequest`, `rejectPurchaseRequest`, `cancelPurchaseRequest`, `recordReceiving`, `inspectReceiving`, `listPurchaseRequests`, and `getPurchaseRequest`.

- [ ] **Step 1: Write DB integration tests**

```ts
it('creates a reviewed request from a shortage and accepts a partial receipt', async () => {
  const request = await createPurchaseRequest({ orgId, lines: shortageLines, actorId })
  await approvePurchaseRequest(request.id, orgId, actorId)
  const receipt = await recordReceiving({ orgId, requestId: request.id, lines: [{ lineId: request.lines[0].id, quantity: 5 }] })
  expect(receipt.status).toBe('pending_inspection')
  await inspectReceiving({ orgId, receivingId: receipt.id, outcome: 'partially_accepted', acceptedQuantities: { [receipt.lines[0].id]: 4 } })
  expect(await getMaterialAvailability(materialId, orgId)).toMatchObject({ incoming: 1, onHand: 4 })
})
```

- [ ] **Step 2: Run test and verify it fails**

Run: `bun run test -- src/features/procurement/model.test.ts`
Expected: FAIL because tables/model are absent.

- [ ] **Step 3: Add schema and migration**

Add org-scoped `purchase_requests`, `purchase_request_lines`, `receivings`, and `receiving_lines` with status, actor, requirement/material references, quantities, costs, supplier text, inspection outcome, evidence/notes, and timestamps. Preserve requirement provenance and never delete historical receiving rows.

- [ ] **Step 4: Implement transactional state changes**

Requests require owner/admin authorization and explicit status guards. Receiving is recorded as incoming/pending inspection; inspection posts accepted quantity through the material ledger and leaves rejected quantity unavailable. Update requirement incoming/projected summaries transactionally and make repeated inspection idempotent.

- [ ] **Step 5: Run tests and commit**

```bash
bun run test -- src/features/procurement/model.test.ts
git add src/db/schema.ts drizzle/0038_mto_procurement_receiving.sql drizzle/meta src/features/procurement
git commit -m "feat: add reviewed procurement and receiving records"
```

### Task 3: Expose procurement operations and UI

**Files:**
- Create: `src/features/procurement/server.ts`, `src/features/procurement/hooks.ts`
- Create: `src/features/procurement/pages/procurement-page.tsx`
- Create: `src/features/procurement/components/purchase-request-form.tsx`
- Create: `src/features/procurement/components/receiving-dialog.tsx`
- Create: `src/routes/_org/procurement/index.tsx`
- Modify: `src/lib/query-keys.ts`, `src/features/permissions/model.ts`, sidebar/messages
- Test: co-located server/hook/page/route tests

**Interfaces:**
- Functions: `listPurchaseRequestsFn`, `createPurchaseRequestFn`, `submitPurchaseRequestFn`, `approvePurchaseRequestFn`, `recordReceivingFn`, `inspectReceivingFn`.
- Hooks invalidate procurement/material/requirements/order-readiness keys.

- [ ] **Step 1: Write failing UI/authorization tests**

```tsx
expect(screen.getByText('procurement.pendingInspection')).toBeVisible()
expect(screen.getByRole('button', { name: 'procurement.approve' })).toBeVisible()
```

Cover owner/admin-only approval, member read visibility, pending inspection not counted as available, and empty/error/loading/data states.

- [ ] **Step 2: Implement server functions and role predicates**

Use Zod input validators, server-side org/role resolution, `MutationResult`, and query invalidation. Never accept client org ids or client-calculated incoming/available values.

- [ ] **Step 3: Build responsive localized UI and route guard**

Compose `PageHeader`, `PageContent`, DataTable/mobile cards, form/dialog primitives, translated statuses, and explicit receiving/inspection outcomes. Add route metadata/sidebar entry and redirect unauthorized users to `/`.

- [ ] **Step 4: Run tests and commit**

```bash
bun run test -- src/features/procurement src/routes/_org/procurement
bun run typecheck
git add src/features/procurement src/routes/_org/procurement src/lib/query-keys.ts src/features/permissions src/components/app-sidebar.tsx src/messages
git commit -m "feat: manage procurement and receiving"
```

### Task 4: Verify procurement delivery

**Files:**
- Test: `e2e/procurement-receiving.spec.ts`
- Test: all procurement/material/readiness tests

- [ ] **Step 1: Run the E2E scenario**

Create a shortage, draft and submit a request, approve it as admin, record partial receiving, reject part during inspection, accept the remainder, and verify incoming/available/readiness values. Use existing E2E helpers and do not truncate in browser tests.

Run: `bun run test:e2e -- e2e/procurement-receiving.spec.ts`

- [ ] **Step 2: Run final checks**

```bash
bun run test -- src/features/procurement src/features/materials
bun run typecheck
bun run check
bun run build
```

- [ ] **Step 3: Commit verification**

```bash
git add src e2e drizzle
git commit -m "test: verify procurement receiving delivery"
```
