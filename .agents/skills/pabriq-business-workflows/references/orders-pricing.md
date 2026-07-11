# Orders and Pricing Reference

Use this reference when creating, approving, rejecting, or adjusting orders, or when computing line-item pricing from breakpoints. Owned by `src/features/orders/model.ts`.

## Scope

Covers the order aggregate: creation readiness, draft order lifecycle, approval/rejection, quantity adjustment with invoice rewrite, deadline computation, and the pricing engine integration. The order is the hub entity — all other domains read from or react to it.

## State machine

```
draft → pending → approved → in_progress → in_delivery → completed
                         ↘ rejected
```

**Canonical source:** `src/features/orders/model.ts`

| Transition | Function | Guard | Side effects |
|-----------|----------|-------|-------------|
| `draft→pending` | `confirmPortalOrder()` (portal/model.ts:463) | `status === 'draft'`; guest→customer creation; Jakarta after-15:00 cutoff pushes queueDate+1 | Recomputes non-manual deadlines via `addWorkingDays`. Logs `draft_confirmed`. |
| `pending→approved` | `approveOrder()` (model.ts:1713) | `status === 'pending'` | Sets `approvedAt`, `approvedBy`. Calls `spawnQueuedPreProductionTasksForOrder()` in same tx. |
| `pending→rejected` | `rejectOrder()` (model.ts:1748) | `status === 'pending'`; `rejectedBy` + `reason` required | Sets `rejectedAt`, `rejectedBy`, `rejectReason`. |
| `approved→in_progress` | `advanceOrderStatus()` (model.ts:1776) | `status === 'approved'` | Logs `production_started` activity event. |
| `in_progress→in_delivery` | `markShipped()` | `status === 'in_progress'` | Sets `shippedAt`, `courier`, `trackingNumber`. Archives completed production tasks. |
| `in_delivery→completed` | `advanceOrderStatus()` | `status === 'in_delivery'` | Sets `deliveredAt`. |

**Observed.**

## Invariants

| Invariant | Enforcement location | Error message |
|-----------|---------------------|--------------|
| Quantity > 0 | `createDraftOrder`, `updateDraftOrder`, `adjustOrderQuantity` | `'Quantity must be greater than zero'` |
| Quantity ≥ minQuantity | `createDraftOrder`, `updateDraftOrder` | `'Quantity below minimum of {N}'` |
| Repeat order min qty | `createDraftOrder`, `updateDraftOrder` | `'Quantity below repeat order minimum of {N}'` |
| Max production quantity requires manual deadline | `createDraftOrder`, `updateDraftOrder` | `'Manual deadline required'` |
| Only draft orders editable | `updateDraftOrder` | `'Can only modify draft orders'` |
| Only pending orders can be approved/rejected | `approveOrder`, `rejectOrder` | `'Only pending orders can be ...'` |
| Order creation readiness | `createDraftOrderFn` (server.ts:44) | `'Complete order setup before creating an order'` — checks 4 conditions: businessAddressComplete, productionStageCount>0, activeProductCount>0, paymentMethodCount>0 |

**Observed.**

## Recipes

### Create draft order

**Trigger:** Operator clicks "New Order" (server function: `createDraftOrderFn` at `src/features/orders/server.ts:44`)

1. `getOrderCreationReadiness(orgId)` — verifies 4 prerequisites
2. `createDraftOrder(orgId, input)` — validates customer, products, quantities
3. For each line item: `computeLineItemPricing()` → loads product, breakpoints, calculates `unitPrice` via `calculateUnitPrice()`, adds addon surcharges
4. Computes `orderTotal`, `orderDeadline` (max of item deadlines or manual)
5. Generates `orderNumber` (`ORD-{year}-{NNN}`), `orderToken` (32-char hex), `validUntil` (+7 days)
6. Inserts: `orders`, `order_line_items`, `order_line_item_addons`

**Canonical:** `orders/model.ts:createDraftOrder`

### Approve order → spawn tasks

**Trigger:** Operator approves pending order

1. `approveOrder(id, orgId, approvedBy)` inside `db.transaction()`
2. Guard: `status === 'pending'`
3. Sets `status='approved'`, `approvedAt`, `approvedBy`
4. `spawnQueuedPreProductionTasksForOrder(tx, {orderId, orgId, allowedStatuses: ['approved']})`

**Cross-domain contract:** See hub skill "Order approval → pre-production task spawning".

**Canonical:** `orders/model.ts:approveOrder` (line 1713) + `production/task-spawn-helpers.ts`

### Adjust order quantity

**Trigger:** Operator adjusts line item quantity on a confirmed order

1. Inside `db.transaction()`: validate quantity invariants, recompute pricing via `computeLineItemPricing()`
2. Update `order_line_items` (quantity, unitPrice, total)
3. Recompute `order.total` from all line items
4. Call `rewriteFinalInvoiceFromOrder()` — regenerates product lines, preserves non-product lines
5. Sync production task context snapshots for active (non-completed) tasks

**Cross-domain contract:** See hub skill "Order quantity adjustment → invoice rewrite".

**Canonical:** `orders/model.ts:adjustOrderQuantity`

## Pricing engine

**Location:** `src/features/pricing/engine.ts` — pure function `calculateUnitPrice(input: PricingInput): PricingResult`

**State model:** Stateless. Types: `Breakpoint { minQuantity, unitPrice }`, `PricingInput { quantity, breakpoints, manualUnitPrice?, currency?, mode? }`, `PricingResult = PricingSuccess | PricingError`.

**Modes:**
- `interpolated` (default): linear interpolation between breakpoints
- `step`: uses the lower breakpoint's price for the range

**Error codes:** `NO_BREAKPOINTS`, `INVALID_QUANTITY`, `NO_MATCHING_BREAKPOINT`

**Integration path:** `computeLineItemPricing()` in `orders/model.ts:370-487` wraps the engine:
1. Loads breakpoints via `listBreakpoints(productId)`
2. Injects `basePrice` at `minQuantity` if no explicit breakpoint exists
3. Handles repeat-order pricing (`repeatOrderUnitPrice`)
4. Handles negotiate-above-quantity mode (manual override or cheapest known)
5. Adds addon surcharges to final `unitPrice`

**Observed.**

## Auth and role guards

| Operation | Required role | Guard function |
|-----------|--------------|---------------|
| Create orders | owner, admin, member | `canCreateOrders` |
| Approve/reject orders | owner, admin | `canApproveOrders` |
| Adjust confirmed order | owner, admin | `canAdjustConfirmedOrder` |

**Observed.** Source: `src/features/permissions/model.ts`.

## Canonical symbols

| Symbol | File | Line |
|--------|------|------|
| `Order` (type) | `src/features/orders/model.ts` | 43 |
| `OrderLineItem` (type) | `src/features/orders/model.ts` | 74 |
| `CreateDraftOrderInput` (type) | `src/features/orders/model.ts` | — |
| `createDraftOrder()` | `src/features/orders/model.ts` | — |
| `approveOrder()` | `src/features/orders/model.ts` | 1713 |
| `rejectOrder()` | `src/features/orders/model.ts` | 1748 |
| `advanceOrderStatus()` | `src/features/orders/model.ts` | 1776 |
| `markShipped()` | `src/features/orders/model.ts` | — |
| `adjustOrderQuantity()` | `src/features/orders/model.ts` | — |
| `computeLineItemPricing()` | `src/features/orders/model.ts` | 370 |
| `getOrderCreationReadiness()` | `src/features/orders/model.ts` | — |
| `calculateUnitPrice()` | `src/features/pricing/engine.ts` | — |
| `createDraftOrderFn` | `src/features/orders/server.ts` | 44 |

## Focused safe tests

Run: `bun run test -- src/features/orders/model.test.ts src/features/pricing/engine.test.ts src/features/orders/line-item-display.test.ts`

| Scenario | Test location | What's verified |
|---------|--------------|----------------|
| Draft order with breakpoint pricing | `orders/model.test.ts` `createDraftOrder` | Line item totals computed correctly from breakpoints |
| Repeat order pricing | `orders/model.test.ts` `createDraftOrder` | Uses `repeatOrderUnitPrice` and `repeatOrderMinQuantity` |
| Max production quantity requires manual deadline | `orders/model.test.ts` `createDraftOrder` | Throws when exceeds without manual deadline |
| Quantity adjustment with invoice rewrite | `orders/model.test.ts` `adjustOrderQuantity` | Transaction atomicity, invoice rebuild, overpaid detection |
| Pricing interpolation vs step | `pricing/engine.test.ts` | Linear interpolation result, step mode result, manual override |
| Line item display normalization | `orders/line-item-display.test.ts` | Design name dedup from product name |

**Observed.**

## Exhaustive completion criterion

Every order status transition is accounted for in the state machine table; every invariant has an enforcement location and error message; every recipe names its canonical function and source file; the pricing engine integration path covers all five wrapping steps; every auth guard maps to a named function in `permissions/model.ts`.
