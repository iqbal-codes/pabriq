# Invoices and Payments Reference

Use this reference when creating invoices (order-linked or standalone), confirming or rejecting payments, voiding invoices, or reconciling payment balances. Owned by `src/features/invoices/model.ts`.

## Scope

Covers the invoice aggregate: creation, payment lifecycle, balance computation, invoice rewriting on quantity adjustment, and payment provider flows. This reference retains only invoice/payment lifecycle behavior — Midtrans protocol setup (signature keys, snap token generation, webhook registration) is out of scope.

## State machines

### Invoice states

```
unpaid → partially_paid → paid
unpaid → void
```

### Payment states

```
pending → confirmed
pending → rejected
```

**Canonical source:** `src/features/invoices/model.ts`

| Transition | Function | Guard | Side effects |
|-----------|----------|-------|-------------|
| Create (order-linked) | `createInvoice()` (model.ts:251) | Order exists; `percentage` parameter | Copies order line items as `product` lines. Adds `shipping` line if shippingFee. Adds `cashback` line for late fee. Updates `courier` on order. |
| Create (standalone) | `createInvoice()` | No `orderId` | Manual line items only. |
| `unpaid→paid` | `markInvoicePaid()` (model.ts:582) | `status ∈ {unpaid, partially_paid}` | Creates synthetic confirmed payment for remaining balance. Sets `paidAt`, `paidBy`. |
| `unpaid→void` | `voidInvoice()` (model.ts:655) | `status === 'unpaid'` only | Sets `status = 'void'`. |
| `pending→confirmed` | `confirmPayment()` (model.ts:795) | `status === 'pending'` | Updates invoice: if `remaining ≤ 0` → `'paid'`; else → `'partially_paid'`. Returns `InvoiceBalance`. |
| `pending→rejected` | `rejectPayment()` (model.ts:852) | `status === 'pending'` | Sets `rejectedReason`. |

**Observed.**

## Invariants

| Invariant | Enforcement location | Error message |
|-----------|---------------------|--------------|
| Invoice void requires unpaid | `voidInvoice()` (model.ts:655) | `'Only unpaid invoices can be voided'` |
| Payment confirm requires pending | `confirmPayment()` (model.ts:795) | `'Only pending payments can be confirmed'` |
| Payment reject requires pending | `rejectPayment()` (model.ts:852) | `'Only pending payments can be rejected'` |
| Cannot rewrite paid final invoice | `rewriteFinalInvoiceFromOrder()` (model.ts:1097) | `'Cannot rewrite paid final invoice'` |
| Cannot rewrite void final invoice | `rewriteFinalInvoiceFromOrder()` (model.ts:1097) | `'Cannot rewrite void final invoice'` |
| Final invoice creation requires due date + payment method | `completeProductionFn` (orders/server.ts:334) | `'Due date and payment method are required to create the final invoice'` |

**Observed.**

## Invoice line types

`product | shipping | fee | discount | tax | cashback`

Product lines are regenerated from order line items during creation and rewrite. Non-product lines (shipping, fee, cashback) are added as separate operations and preserved during rewrite.

**Observed.**

## Recipes

### Create order-linked invoice

**Trigger:** Called from `completeProductionFn` (orders/server.ts:212) or manually by operator

1. `createInvoice(orgId, input)` at `src/features/invoices/model.ts:251`
2. When `input.orderId` is present: loads order, copies `order_line_items` as `product` invoice lines
3. Adds `shipping` line if `input.shippingFee` is provided
4. Adds `cashback` line if `input.lateFee` is provided (late fee appears as a negative cashback)
5. Generates `invoiceNumber` (`INV-{year}-{NNNN}`)
6. Updates order `courier` if present

**Canonical:** `invoices/model.ts:createInvoice` (line 251)

### Confirm payment (bank_transfer)

**Trigger:** Operator confirms a manual bank transfer payment

1. `confirmPayment(orgId, paymentId, userId)` at `src/features/invoices/model.ts:795`
2. Guard: `payment.status === 'pending'`
3. Sets `payment.status = 'confirmed'`, `confirmedAt`, `confirmedBy`
4. Calls `getInvoiceBalance(payment.invoiceId, orgId)` to compute remaining
5. If `balance.remaining ≤ 0`: sets `invoice.status = 'paid'`, `paidAt`, `paidBy`
6. If `balance.remaining > 0`: sets `invoice.status = 'partially_paid'`
7. Returns `{ payment, balance }`

**Canonical:** `invoices/model.ts:confirmPayment` (line 795)

### Confirm payment (midtrans webhook)

**Trigger:** Midtrans sends notification to `src/routes/api/midtrans-notification.ts`

1. SHA-512 signature verification on `order_id + status_code + gross_amount + serverKey`
2. Idempotent: checks for existing confirmed payment with same reference
3. Creates payment → calls `confirmPayment()` internally

**Observed.** Midtrans protocol setup (key management, snap token generation) is out of scope for this skill.

### Void invoice

**Trigger:** Operator voids an unpaid invoice

1. `voidInvoice(id, orgId)` at `src/features/invoices/model.ts:655`
2. Guard: `status === 'unpaid'` — throws `'Only unpaid invoices can be voided'`
3. Sets `status = 'void'`

**Canonical:** `invoices/model.ts:voidInvoice` (line 655)

### Rewrite final invoice on quantity adjustment

**Trigger:** Order quantity is adjusted (cross-domain — called from `adjustOrderQuantity` inside same DB transaction)

1. `rewriteFinalInvoiceFromOrder(client, {orgId, orderId, invoiceId, paidAmount})` at `src/features/invoices/model.ts:1097`
2. Guards: invoice must not be `'paid'` or `'void'`
3. Regenerates `product` lines from current `order_line_items`
4. Preserves non-product lines (shipping, fee, cashback, etc.)
5. Recomputes totals considering `paidAmount`
6. Returns `{ invoiceId, total, percentage, overpaidAmount }`

**Cross-domain contract:** See hub skill "Order quantity adjustment → invoice rewrite".

**Canonical:** `invoices/model.ts:rewriteFinalInvoiceFromOrder` (line 1097)

## Balance computation

`getInvoiceBalance(invoiceId, orgId)` at `src/features/invoices/model.ts:1017` computes:
- `total`: sum of invoice line item totals
- `confirmedAmount`: sum of confirmed payments
- `pendingAmount`: sum of pending payments
- `remaining`: `total - confirmedAmount`
- `isFullyPaid`: `remaining ≤ 0`

**Observed.**

## Auth and role guards

| Operation | Required role | Guard function |
|-----------|--------------|---------------|
| Manage invoices | owner, admin | `canManageInvoices` |

**Observed.** Source: `src/features/permissions/model.ts`.

## Canonical symbols

| Symbol | File | Line |
|--------|------|------|
| `Invoice` (type) | `src/features/invoices/model.ts` | 27 |
| `InvoiceLineItem` (type) | `src/features/invoices/model.ts` | 48 |
| `PaymentMethod` (type) | `src/features/invoices/model.ts` | 59 |
| `CreateInvoiceInput` (type) | `src/features/invoices/model.ts` | — |
| `InvoiceBalance` (type) | `src/features/invoices/model.ts` | — |
| `createInvoice()` | `src/features/invoices/model.ts` | 251 |
| `markInvoicePaid()` | `src/features/invoices/model.ts` | 582 |
| `voidInvoice()` | `src/features/invoices/model.ts` | 655 |
| `confirmPayment()` | `src/features/invoices/model.ts` | 795 |
| `rejectPayment()` | `src/features/invoices/model.ts` | 852 |
| `getInvoiceBalance()` | `src/features/invoices/model.ts` | 1017 |
| `rewriteFinalInvoiceFromOrder()` | `src/features/invoices/model.ts` | 1097 |

## Focused safe tests

Run: `bun run test -- src/features/invoices/model.test.ts src/routes/api/midtrans-notification.test.ts`

| Scenario | Test location | What's verified |
|---------|--------------|----------------|
| Invoice creation (order-linked) | `invoices/model.test.ts` | Product lines copied from order, shipping/cashback lines added |
| Invoice creation (standalone) | `invoices/model.test.ts` | Manual line items, no orderId dependency |
| Payment confirmation → invoice status | `invoices/model.test.ts` | `pending→confirmed` updates invoice to `paid` or `partially_paid` |
| Invoice void guard | `invoices/model.test.ts` | Only `unpaid` invoices can be voided |
| Invoice rewrite on quantity adjustment | `invoices/model.test.ts` | Product lines regenerated, non-product lines preserved, totals recomputed |
| Midtrans webhook idempotency | `routes/api/midtrans-notification.test.ts` | Signature verify, duplicate payment guard |

**Observed.**

## Exhaustive completion criterion

Every invoice status transition is accounted for in the state machine table; every payment status transition is accounted for; every invariant has an enforcement location and error message; every recipe names its canonical function and source file; the balance computation covers all four output fields; the invoice rewrite recipe covers guard checks, line regeneration, and total recomputation; the webhook path retains only lifecycle behavior with protocol setup explicitly excluded.
