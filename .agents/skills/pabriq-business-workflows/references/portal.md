# Portal Reference

Use this reference when implementing token-based order views, draft confirmation, portal write-back operations, or order timeline views. Owned by `src/features/portal/model.ts`.

## Scope

Covers the portal aggregate: token-based customer access to orders, draft confirmation (which is the `draft→pending` transition), thin write-back operations on line items/assets/addresses, payment proof submission, and timeline views. The portal is a view layer over orders, invoices, and production — it reads from all three and writes back to orders only through well-defined operations.

## Auth model

**Token-based:** `orderToken` on `orders` table (32-char UUID hex). Unique index. Portal page: `/order/$token`.

`getOrgIdFromToken()` calls `getPortalOrder(token)`, extracts `order.orgId`. No user session required — the token itself authorizes access to that specific order.

`getPortalOrder(token)` at `src/features/portal/model.ts:128` returns a rich `PortalOrder` with:
- Order basics, customer info, org profile (name, logo, phone)
- Line items enriched with: assets, current task number, current stage name
- Invoices enriched with: payment method details, `hasPaymentProof`, `midtransOrderId`, `shippingFee`
- First production/pre-production stage names

**Observed.**

## Invariants

| Invariant | Enforcement location | Error message |
|-----------|---------------------|--------------|
| Portal guest requires name + phone | `confirmPortalOrder()` (model.ts:463) | `'guestInfoRequired'` |
| Token must resolve to valid order | `getPortalOrder()` (model.ts:128) | Returns null/throws if no order matches token |

**Observed.**

## Recipes

### Confirm portal order (draft → pending)

**Trigger:** Customer completes draft order via token URL

1. `confirmPortalOrder({orderId, guestName?, guestPhone?})` at `src/features/portal/model.ts:463`
2. Jakarta timezone check: after 15:00 WIB → `queueDate = next working day`
3. Guest customer creation or phone-match to existing customer
4. Recompute non-manual deadlines from submission timestamp via `addWorkingDays()`
5. Set `status = 'pending'`, `createdAt = queueDate`
6. Log `draft_confirmed` activity

**Cross-domain contract:** This is the `draft→pending` transition in the order state machine. See hub skill and [`references/orders-pricing.md`](orders-pricing.md).

**Canonical:** `portal/model.ts:confirmPortalOrder` (line 463)

### Update portal line item

**Trigger:** Customer edits design name, notes, or asset on a line item

1. `updatePortalLineItem(token, lineItemId, updates)` (portal/model.ts)
2. Updates `designName`, `notes`, or `assetId` on the line item
3. Validates the line item belongs to the order identified by the token

**Canonical:** `portal/model.ts`

### Submit payment proof

**Trigger:** Customer uploads payment proof for an invoice

1. `submitPaymentProof(token, invoiceId, assetData)` (portal/model.ts)
2. Inserts asset with `ownerType = 'invoice'`, `usage = 'payment_proof'`
3. Validates invoice belongs to the order identified by the token

**Canonical:** `portal/model.ts`

### Save portal address

**Trigger:** Customer creates or updates shipping address

1. `savePortalAddress(token, addressData)` (portal/model.ts)
2. Creates address record, updates customer `addressId`, updates order `shippingAddress`

**Canonical:** `portal/model.ts`

### Remove portal asset

**Trigger:** Customer removes an uploaded asset

1. `removePortalAsset(token, assetId)` (portal/model.ts)
2. Soft-delete: sets `status = 'deleted'`

**Canonical:** `portal/model.ts`

## Timeline views

### Task-level production timeline

`getOrderTasksTimeline(token)` at `src/features/portal/model.ts`:
- Reads from `taskActivity` table
- Builds events: `created`, `stage_transition`, `board_transition`, `completed`
- Includes requirement responses
- Scoped to the order identified by the token

### Order-level milestone timeline

`getOrderTimeline(token)` at `src/features/portal/model.ts:1573` / `getOrderTimelineByOrderId(orderId, orgId)` at `src/features/portal/model.ts:1304`:
- Builds milestone events: `draft_created` → `draft_confirmed` → `order_approved` → `dp_invoice_created` → `dp_payment_confirmed` → `production_started` → `final_invoice_created` → `final_payment_confirmed` → `production_finished` → `shipment_confirmed` → `order_completed`
- Also shows `quantity_adjusted` events
- Distinguishes DP (down payment) vs final invoice milestones
- The operator-side variant (`getOrderTimelineByOrderId`) does not require a token — it takes `orderId` + `orgId` directly

**Observed.**

## Auth and role guards

Portal operations use token-based auth — no role guards. The token itself authorizes access to one specific order. Org ID is resolved from the token via `getOrgIdFromToken()`.

All other auth (for operator-side timeline, etc.) goes through `resolveOrgId()` or `resolveOrgAndRole()` as in other domains.

**Observed.**

## Canonical symbols

| Symbol | File | Line |
|--------|------|------|
| `PortalOrder` (type) | `src/features/portal/model.ts` | — |
| `PortalLineItem` (type) | `src/features/portal/model.ts` | 31 |
| `PortalInvoice` (type) | `src/features/portal/model.ts` | 49 |
| `PortalAsset` (type) | `src/features/portal/model.ts` | 24 |
| `getPortalOrder()` | `src/features/portal/model.ts` | 128 |
| `confirmPortalOrder()` | `src/features/portal/model.ts` | 463 |
| `getOrderTimeline()` | `src/features/portal/model.ts` | 1573 |
| `getOrderTimelineByOrderId()` | `src/features/portal/model.ts` | 1304 |
| `getOrgIdFromToken()` | `src/features/portal/model.ts` | — |

## Focused safe tests

Run: `bun run test -- src/features/portal/model.test.ts`

| Scenario | Test location | What's verified |
|---------|--------------|----------------|
| Portal order retrieval | `portal/model.test.ts` | Token resolves to correct order with enriched line items and invoices |
| Portal order confirmation | `portal/model.test.ts` `confirmPortalOrder` | Guest customer creation, phone matching, deadline recomputation, Jakarta cutoff |
| Portal timeline events | `portal/model.test.ts` `getOrderTimeline` | Milestone classification, dp vs final invoice, payment status |
| Portal write-back operations | `portal/model.test.ts` | Line item update, asset removal, address save, payment proof upload |
| Token-based auth isolation | `portal/model.test.ts` | Token resolves to correct org, cross-org token fails |

**Observed.**

## Exhaustive completion criterion

The auth model is fully described (token-based, no session); every write-back operation is listed with its guard; the task-level and order-level timeline views are distinguished with their event types and source tables; every invariant has an enforcement location; every recipe names its canonical function and source file; the portal's relationship to orders, invoices, and production is stated as read-heavy with thin writes; the milestone event sequence is enumerated.
