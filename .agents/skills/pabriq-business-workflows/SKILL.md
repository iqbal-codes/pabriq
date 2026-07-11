---
name: pabriq-business-workflows
description: >-
  Orchestrate order-to-delivery workflows across four state machines —
  order lifecycle and pricing, invoice and payment, production task
  boards, and portal customer access.
  Use when working with order status transitions and pricing calculations,
  invoice creation or payment confirmation and balance reconciliation,
  production task advancement through stages or board transitions,
  or portal order confirmation and timeline views.
---

# Business Workflows

Four interconnected state machines govern the order-to-delivery lifecycle. This skill owns the cross-domain orchestration contracts and the invariant-first execution sequence that bind them. Each domain's state machine, recipes, and verification live in a branch-specific reference.

## Ownership boundary

| Domain | Model owner | Server functions | Auth guard |
|--------|------------|-----------------|------------|
| Orders + Pricing | `src/features/orders/model.ts` | `src/features/orders/server.ts` | `resolveOrgId()` → `orgId`; role via `resolveOrgAndRole()` |
| Invoices + Payments | `src/features/invoices/model.ts` | `src/features/invoices/server.ts` | `resolveOrgId()` → `orgId` |
| Production + Tasks | `src/features/production/model.ts` + `spawner.ts` + `task-spawn-helpers.ts` | `src/features/production/server.ts` | `resolveOrgId()` → `orgId`; role via `resolveOrgAndRole()` |
| Portal | `src/features/portal/model.ts` | `src/features/portal/server.ts` | Token-based: `getOrgIdFromToken()` resolves `orgId` from `orderToken` |
Every org-scoped operation receives `orgId` explicitly and filters every query with `eq(table.orgId, orgId)`. This is the primary tenant isolation mechanism — cross-org data never leaks. **Observed.**

Roles: `owner | admin | member` (from `src/features/permissions/model.ts`). Permission functions are pure guards on the role string. **Observed.**

## Cross-domain orchestration contracts

These contracts cross aggregate boundaries. Each is a write-side owner driving a read-side consumer. All references below point at the function that initiates the contract.

### Order approval → pre-production task spawning

- **Owner:** `approveOrder()` in `src/features/orders/model.ts:1713`
- **Consumer:** `spawnQueuedPreProductionTasksForOrder()` in `src/features/production/task-spawn-helpers.ts:18`
- **Transaction boundary:** Same DB transaction. `approveOrder` wraps the status update and task spawning in `db.transaction()`.
- **Invariant:** Tasks are spawned exactly once per line item (idempotent — skips existing `lineItemId`). Guard: `allowedStatuses: ['approved']`.
- **Error:** If order status is not `'pending'`, throws `'Only pending orders can be approved'`.

### Pre-production completion → board transition (start production)

- **Owner:** `startProductionForOrder()` in `src/features/production/spawner.ts:138`
- **Consumer:** `advanceOrderStatus()` in `src/features/orders/model.ts:1776`
- **Guards (all must pass):**
  1. Order status === `'approved'`
  2. At least one invoice with `status === 'paid'`
  3. All tasks must have `status === 'ready_for_production'`
  4. At least one active production stage exists
- **Transaction boundary:** DB transaction wraps task board/status update and `board_transition` activity logs. `advanceOrderStatus` runs outside the transaction.
- **Error:** Throws on any failed guard (`'Only approved orders can start production'`, `'At least one paid invoice is required...'`, `'All pre-production tasks must be ready...'`, `'No active production stage'`).

### Production completion → final invoice creation

- **Owner:** `completeProductionFn` in `src/features/orders/server.ts:212`
- **Consumer:** `createInvoice()` in `src/features/invoices/model.ts:251`, `markShipped()` in `src/features/orders/model.ts`
- **Guards:**
  1. All production tasks must have `status === 'completed'`
  2. Order status must be `'in_progress'` or `'approved'`
  3. When creating a final invoice: due date and payment method are required
- **Transaction boundary:** `completeProductionFn` is a server function with no outer transaction. It calls `createInvoice()` (standalone DB operations) and `markShipped()` (standalone DB operation) sequentially. If `order.status === 'approved'`, it auto-advances to `'in_progress'` with `actorId: 'system'` before creating the invoice.
- **Error:** `'Cannot complete production: N task(s) still in progress'` when tasks are incomplete.

### Order quantity adjustment → invoice rewrite

- **Owner:** `adjustOrderQuantity()` in `src/features/orders/model.ts`
- **Consumer:** `rewriteFinalInvoiceFromOrder()` in `src/features/invoices/model.ts:1097`
- **Transaction boundary:** Same DB transaction. The adjustment, invoice rewrite, and production task context sync all run inside one `db.transaction()`.
- **Invariant:** Only non-`'paid'` and non-`'void'` final invoices are rewritten. Product lines are regenerated from current order lines; non-product lines (shipping, fee, cashback) are preserved.
- **Error:** `'Cannot rewrite paid final invoice'` or `'Cannot rewrite void final invoice'`.

### Pricing engine integration

- **Owner:** `calculateUnitPrice()` in `src/features/pricing/engine.ts` (pure function)
- **Consumer:** `computeLineItemPricing()` in `src/features/orders/model.ts:370` (wraps the engine)
- **No transaction boundary:** Pure function, no DB access. `computeLineItemPricing` loads breakpoints, handles repeat-order pricing, negotiate-above-quantity mode, and addon surcharges.

## Invariant-first execution sequence

When modifying or extending any workflow, enforce invariants in this order before touching transition logic:

1. **Org scoping:** Every function must take `orgId` and filter every query with `eq(table.orgId, orgId)`. No exception.
2. **Status guard:** Check current status matches the required source state before any mutation. Throw on mismatch.
3. **Precondition checks:** Validate all business invariants (quantity > 0, quantity ≥ minQuantity, manual deadline required for max production quantity, stage requirements fulfilled, etc.).
4. **Transaction boundary:** Place side-effecting mutations that must be atomic inside `db.transaction()`. Sequential calls that may fail independently stay outside.
5. **Idempotency:** Task spawning is idempotent per `lineItemId`. Payment confirmation checks for duplicate confirmed payments with the same reference. Write these guards explicitly.
6. **Activity logging:** Log `activity_events` for order-level milestones and `task_activity` for production-level transitions after the state change succeeds.

## Error behavior pattern

- **Model functions** throw `Error` with descriptive messages for guard failures. Callers must handle these.
- **Server functions** (`createServerFn`) catch and return `MutationResult` (`{ ok: true }` or `{ ok: false, error: string }`). Some model errors propagate as thrown exceptions through server functions — this is an inconsistency.
- **Portal functions** use try/catch and return typed result objects (`PortalConfirmResult`).

**Observed:** The inconsistency between thrown errors in model functions vs. returned `MutationResult` in server functions is current repository practice, not a deliberate design choice.

## Branch-specific references

Each reference owns one domain's state machine, recipes, invariants, and verification.

- When creating, approving, rejecting, or adjusting orders, or changing breakpoint pricing, read [`references/orders-pricing.md`](references/orders-pricing.md) before modifying transition or pricing logic.
- When creating invoices, confirming or rejecting payments, voiding invoices, or reconciling balances, read [`references/invoices-payments.md`](references/invoices-payments.md) before modifying lifecycle logic.
- When advancing tasks, reviewing advancement, managing stages, or transitioning production boards, read [`references/production-tasks.md`](references/production-tasks.md) before modifying task or board state.
- When changing token-based order access, portal confirmation, write-back operations, or timelines, read [`references/portal.md`](references/portal.md) before modifying portal behavior.

<!-- CODEBASE-SKILL-FORGE:HUMAN:START -->
<!-- Add intentional project policy here. Sync preserves this region byte-for-byte. -->
<!-- CODEBASE-SKILL-FORGE:HUMAN:END -->
