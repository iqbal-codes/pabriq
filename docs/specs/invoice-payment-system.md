# Spec: Invoice Payment System

> **Status:** Draft  
> **Created:** 2026-05-14  
> **Context:** Invoice feature is partially functional. Missing: payment tracking, invoice section on order detail, create invoice button on invoice list, payment proof review flow, and support for split/partial payments.

---

## Problem Statement

The current invoice system stores a binary `status: 'unpaid' | 'paid' | 'void'` directly on the invoice. This means:

1. **No partial payment tracking** — an invoice is either unpaid or fully paid, with no record of how much was paid or when
2. **No payment records** — when a customer uploads a payment proof, there's no payment entity, just an asset dangling in the database
3. **Org can't review payment proofs** — the invoice detail page has no section to view uploaded proofs
4. **Payment proof upload is broken** — `progress-view.tsx` calls both `portalFinalizeUploadFn` AND `submitPaymentProofFn` with the same `assetId`, causing a duplicate PK constraint violation
5. **No "Create Invoice" button on invoice list** — the route defines `primaryAction` in `beforeLoad` but the page component doesn't pass it to `PageHeader`
6. **No invoice section on order detail** — approved orders have no way to create invoices or view existing ones
7. **No `orderId` filter** in `listInvoices` — can't list invoices for a specific order

---

## Design Principles (from research)

1. **Separate "money moved" from "money allocated"** — a payment is a cash event; allocations tie that cash to specific invoices
2. **Store facts, not derived state** — `balance` is computed from payments + allocations, never stored
3. **Payment records are immutable** — if wrong, create a reversal, don't edit
4. **One payment can cover multiple invoices** — via the allocations join table
5. **Status is a workflow label** — derived from allocation sums, not stored as accounting truth

---

## Phase 1: Database Schema (New Tables)

### 1.1 `payments` Table

```typescript
// drizzle/schema.ts — new table definition

export const payments = pgTable('payments', {
  id: text('id').primaryKey(),
  orgId: text('org_id').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  invoiceId: text('invoice_id').notNull().references(() => invoices.id, { onDelete: 'cascade' }),
  amount: real('amount').notNull(),
  method: text('method').notNull().default('bank_transfer'),  // 'bank_transfer' | 'payment_gateway' | 'cash'
  reference: text('reference'),                                // bank transfer ref, receipt #
  proofAssetId: text('proof_asset_id').references(() => assets.id, { onDelete: 'set null' }),
  status: text('status').notNull().default('pending'),         // 'pending' | 'confirmed' | 'rejected' | 'refunded'
  receivedAt: timestamp('received_at', { withTimezone: true }),
  confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
  confirmedBy: text('confirmed_by'),                           // user ID
  rejectedReason: text('rejected_reason'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Indexes
index('idx_payments_org_id').on(payments.orgId),
index('idx_payments_invoice_id').on(payments.invoiceId),
index('idx_payments_status').on(payments.status),
```

**Rationale for including `invoiceId` directly on `payments`:**  
For this project's scope (SMB manufacturing orders), a payment proof is always tied to one specific invoice. The allocation join table is overkill right now. If we later need one-payment-multiple-invoices, we can add a `payment_allocations` table and make `invoiceId` nullable. This keeps Phase 1 simpler.

### 1.2 `invoice_line_items` — Add `lineType` Column

```typescript
// Alter existing column:
lineType: text('line_type').notNull().default('product'),  // 'product' | 'shipping' | 'fee' | 'discount' | 'tax'
```

This allows invoices to include shipping fees, handling charges, discounts, and tax as line items instead of separate header fields.

### 1.3 `invoices` — Add `partially_paid` Status

No schema change needed — expand the status column's valid values in application code:
```
'unpaid' | 'partially_paid' | 'paid' | 'void'
```

### 1.4 Migration

```
drizzle/0022_invoice_payments.sql
```

Steps:
1. Create `payments` table with indexes
2. Add `line_type` column to `invoice_line_items` (nullable → backfill to `'product'` → set NOT NULL with default)
3. Add CHECK constraint on `invoices.status` for the expanded set (optional, Drizzle doesn't support CHECK natively — use raw SQL in migration)

---

## Phase 2: Model Layer (`src/features/invoices/model.ts`)

### 2.1 New Types

```typescript
export type Payment = {
  id: string
  orgId: string
  invoiceId: string
  amount: number
  method: 'bank_transfer' | 'payment_gateway' | 'cash'
  reference: string | null
  proofAssetId: string | null
  status: 'pending' | 'confirmed' | 'rejected' | 'refunded'
  receivedAt: Date | null
  confirmedAt: Date | null
  confirmedBy: string | null
  rejectedReason: string | null
  createdAt: Date
  updatedAt: Date
}

export type CreatePaymentInput = {
  invoiceId: string
  amount: number
  method: 'bank_transfer' | 'payment_gateway' | 'cash'
  reference?: string
  proofAssetId?: string
  receivedAt?: Date
}

export type ConfirmPaymentInput = {
  paymentId: string
}

export type RejectPaymentInput = {
  paymentId: string
  reason: string
}

export type InvoiceBalance = {
  total: number
  paidAmount: number
  pendingAmount: number
  remaining: number
  isFullyPaid: boolean
}

// Updated InvoiceLineItem:
export type InvoiceLineItem = {
  id: string
  invoiceId: string
  lineType: 'product' | 'shipping' | 'fee' | 'discount' | 'tax'  // NEW
  description: string
  quantity: number
  unitPrice: number
  total: number
  createdAt: Date
}

// Updated Invoice status union:
// status: 'unpaid' | 'partially_paid' | 'paid' | 'void'
```

### 2.2 New Model Functions

| Function | Purpose |
|----------|---------|
| `createPayment(orgId, input)` | Create a pending payment record (called by org admin) |
| `createPaymentFromProof(orgId, invoiceId, assetId, amount?)` | Create payment from portal proof upload |
| `confirmPayment(orgId, paymentId, userId)` | Confirm a pending payment → updates invoice status if fully paid |
| `rejectPayment(orgId, paymentId, reason)` | Reject a pending payment |
| `getPaymentsForInvoice(orgId, invoiceId)` | List all payments for an invoice (for detail page) |
| `getInvoiceBalance(invoiceId)` | Compute total, paid, pending, remaining from payments |
| `listInvoices(params)` | **UPDATED** — add `orderId?` filter param |
| `updateInvoice(orgId, id, input)` | **NEW** — update invoice fields (notes, due date, payment method) |

### 2.3 Key Logic: `confirmPayment`

```typescript
export async function confirmPayment(
  orgId: string,
  paymentId: string,
  userId: string,
): Promise<{ payment: Payment; balance: InvoiceBalance }> {
  // 1. Verify payment exists and belongs to org
  // 2. Verify payment is 'pending'
  // 3. Update payment: status = 'confirmed', confirmedAt = now, confirmedBy = userId
  // 4. Recompute invoice balance:
  //    - Sum all confirmed payments for this invoice
  //    - If sum >= invoice.total → status = 'paid', paidAt = now, paidBy = userId
  //    - Else if sum > 0 → status = 'partially_paid'
  // 5. Return updated payment + balance
}
```

### 2.4 Updated `markInvoicePaid`

The existing `markInvoicePaid` should be **deprecated** in favor of the payment-based flow. For backwards compatibility, it can remain but should create a payment record under the hood:

```typescript
export async function markInvoicePaid(
  id: string,
  orgId: string,
  userId: string,
): Promise<Invoice> {
  // Legacy wrapper: create a 'confirmed' payment for the full invoice amount,
  // then confirm it (which updates the invoice status).
  // This way all paid invoices have a corresponding payment record.
}
```

### 2.5 Updated `listInvoices` — Add `orderId` Filter

```typescript
export type ListInvoicesParams = {
  orgId: string
  status?: string
  q?: string
  orderId?: string   // NEW
  page?: number
  perPage?: number
}
```

---

## Phase 3: Server Functions (`src/features/invoices/server.ts`)

### 3.1 New Server Functions

| Function | Method | Input | Output |
|----------|--------|-------|--------|
| `createPaymentFn` | POST | `CreatePaymentInput` | `MutationResult` |
| `confirmPaymentFn` | POST | `{ paymentId: string }` | `{ ok: true; balance: InvoiceBalance }` \| `{ ok: false; error: string }` |
| `rejectPaymentFn` | POST | `{ paymentId: string; reason: string }` | `MutationResult` |
| `getInvoicePaymentsFn` | GET | `{ invoiceId: string }` | `Payment[]` |
| `getInvoiceBalanceFn` | GET | `{ invoiceId: string }` | `InvoiceBalance` |
| `updateInvoiceFn` | POST | `{ id, ...partial invoice fields }` | `MutationResult` |

### 3.2 Fix: `listInvoicesFn` — Add Org Resolution

**Current bug:** `listInvoicesFn` does NOT call `resolveOrgId()` — it passes client-supplied `orgId` directly.

**Fix:** Add org resolution like all other server functions:
```typescript
export const listInvoicesFn = createServerFn({ method: 'GET' })
  .inputValidator((data: ListInvoicesParams) => data)
  .handler(async ({ data }): Promise<ListInvoicesResult> => {
    const orgId = await resolveOrgId()  // ADD THIS
    // Only use orgId from session, ignore data.orgId
    const { listInvoices } = await import('./model')
    return listInvoices({ ...data, orgId })
  })
```

### 3.3 Add Input Validation (Zod schemas)

Replace the identity-cast `.inputValidator()` calls with proper Zod schemas for all mutation endpoints:

```typescript
import { z } from 'zod'

const createPaymentSchema = z.object({
  invoiceId: z.string().min(1),
  amount: z.number().positive(),
  method: z.enum(['bank_transfer', 'payment_gateway', 'cash']),
  reference: z.string().optional(),
  proofAssetId: z.string().optional(),
})

export const createPaymentFn = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => createPaymentSchema.parse(input))
  .handler(...)
```

---

## Phase 4: Hooks (`src/features/invoices/hooks.ts`)

### 4.1 New Hooks

| Hook | Type | Purpose |
|------|------|---------|
| `useCreatePayment()` | Mutation | Create a payment |
| `useConfirmPayment()` | Mutation | Confirm a pending payment |
| `useRejectPayment()` | Mutation | Reject a pending payment |
| `useInvoicePayments(invoiceId)` | Query | List payments for an invoice |
| `useInvoiceBalance(invoiceId)` | Query | Get computed balance |
| `useUpdateInvoice()` | Mutation | Update invoice fields |
| `useMarkInvoicePaid()` | Mutation | **NEW** — shared hook (replaces inline mutation in detail page) |
| `useVoidInvoice()` | Mutation | **NEW** — shared hook |

### 4.2 Query Keys — Add to `#/lib/query-keys`

```typescript
invoices: {
  // ...existing keys...
  payments: (invoiceId: string) =>
    [...queryKeys.invoices.all, 'payments', invoiceId] as const,
  balance: (invoiceId: string) =>
    [...queryKeys.invoices.all, 'balance', invoiceId] as const,
}
```

---

## Phase 5: UI Changes

### 5.1 Invoice List Page — Add "Create Invoice" Button

**File:** `src/features/invoices/pages/invoice-list-page.tsx`

**Change:** Pass `primaryAction` to `PageHeader`:
```tsx
<PageHeader
  title={t('title')}
  primaryAction={{
    label: t('createInvoice'),
    href: '/invoices/new',
  }}
/>
```

### 5.2 Order Detail Page — Add Invoice Section

**File:** `src/features/orders/pages/view-order-page.tsx`

Add a new card section after the line items card, visible for `approved` and later statuses:

```
┌─── Invoices ─────────────────────────┐
│  [Create Invoice]                    │
│                                      │
│  ┌─────────────────────────────────┐ │
│  │ INV-2026-001 │ Rp 5.000.000     │ │
│  │ 50% deposit  │ Unpaid           │ │
│  │ → [View]                        │ │
│  └─────────────────────────────────┘ │
│  ┌─────────────────────────────────┐ │
│  │ INV-2026-002 │ Rp 5.000.000     │ │
│  │ 50% balance  │ Paid ✓           │ │
│  │ → [View]                        │ │
│  └─────────────────────────────────┘ │
│                                      │
│  Total invoiced: Rp 10.000.000/10.000.000 │
└──────────────────────────────────────┘
```

**Requirements:**
- New hook: `useInvoicesByOrderId(orderId)` — calls `listInvoicesFn({ orderId: ... })`
- "Create Invoice" button navigates to `/invoices/new?orderId=<id>&customerId=<id>&customerName=<name>` to pre-fill
- Show invoice count and total invoiced vs order total

### 5.3 Create Invoice Page — Pre-fill from URL Params

**File:** `src/features/invoices/pages/create-invoice-page.tsx`

- Read `orderId`, `customerId`, `customerName` from URL search params (nuqs)
- If `orderId` is present, fetch order details and pre-fill line items from order
- Show percentage selector: Full (100%), Deposit (50%), Custom
- Add payment method dropdown (fetch from `usePaymentMethods()`)
- Add customer search/dropdown instead of text field (deferred if too complex — keep text field for now, add search later)

### 5.4 Invoice Detail Page — Payment Section

**File:** `src/features/invoices/pages/invoice-detail-page.tsx`

Add a new section between the line items card and the action buttons:

```
┌─── Payments ─────────────────────────┐
│                                      │
│  Balance:                            │
│  Total:       Rp 10.000.000          │
│  Paid:        Rp  3.000.000          │
│  Pending:     Rp  2.000.000          │
│  Remaining:   Rp  5.000.000          │
│                                      │
│  Payment History:                    │
│  ┌─────────────────────────────────┐ │
│  │ 2026-05-10 │ Bank Transfer      │ │
│  │ Rp 3.000.000 │ Confirmed ✓      │ │
│  │ Ref: TRF123456                  │ │
│  └─────────────────────────────────┘ │
│  ┌─────────────────────────────────┐ │
│  │ 2026-05-12 │ Bank Transfer      │ │
│  │ Rp 2.000.000 │ ⏳ Pending       │ │
│  │ [View Proof] [Confirm] [Reject] │ │
│  └─────────────────────────────────┘ │
│                                      │
│  [+ Record Payment] (manual entry)   │
└──────────────────────────────────────┘
```

**Requirements:**
- Replace inline `useMutation` for markPaid/void with shared hooks
- Add `[View Proof]` button → opens asset in modal/new tab
- Add `[Confirm]` / `[Reject]` buttons for pending payments
- Add `[Record Payment]` dialog for manual payment entry (admin creates payment without proof)
- Update "Mark as Paid" button → only show if no pending payments exist and balance > 0
- Update status badge to show `partially_paid` state

### 5.5 Portal Payment Proof Upload — Fix Duplicate Insert Bug

**File:** `src/features/portal/pages/progress-view.tsx`

**Current bug (line 46-72):**
```typescript
// BROKEN: both calls use the same assetId → duplicate PK insert
await finalizeUpload.mutateAsync({ ..., lineItemId: invoiceId, ... })  // inserts asset
await submitProof.mutateAsync({ ..., assetId: uploadResult.assetId, ... })  // fails!
```

**Fix:** Remove the `finalizeUpload` call for invoice uploads. The `submitPaymentProofFn` already calls `insertAsset` correctly:

```typescript
async function handleUpload(invoiceId: string, file: File) {
  const uploadResult = await getUploadUrl.mutateAsync({
    token, invoiceId, fileName: file.name,
    fileType: file.type, fileSize: file.size,
  })

  const response = await fetch(uploadResult.uploadUrl, {
    method: 'PUT', body: file, headers: { 'Content-Type': file.type },
  })
  if (!response.ok) throw new Error('Upload failed')

  // ONLY submit the payment proof — don't call finalizeUpload
  const result = await submitProof.mutateAsync({
    token, invoiceId,
    assetId: uploadResult.assetId,
    originalFilename: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
    storageKey: uploadResult.storageKey,
  })
  if (!result.ok) throw new Error(result.error ?? 'Upload failed')
}
```

### 5.6 Portal Payment Section — Hide Void Invoices

**File:** `src/features/portal/components/payment-section.tsx`

Filter out `void` status invoices so customers don't see cancelled invoices.

---

## Phase 6: i18n

### 6.1 New Keys — `invoices` Namespace (`src/messages/en.ts`, `src/messages/id.ts`)

| Key | English | Indonesian |
|-----|---------|------------|
| `payments` | "Payments" | "Pembayaran" |
| `paymentHistory` | "Payment History" | "Riwayat Pembayaran" |
| `recordPayment` | "Record Payment" | "Catat Pembayaran" |
| `confirmPayment` | "Confirm Payment" | "Konfirmasi Pembayaran" |
| `rejectPayment` | "Reject Payment" | "Tolak Pembayaran" |
| `rejectReason` | "Rejection Reason" | "Alasan Penolakan" |
| `balance` | "Balance" | "Saldo" |
| `paidAmount` | "Paid" | "Dibayar" |
| `pendingAmount` | "Pending" | "Menunggu" |
| `remaining` | "Remaining" | "Sisa" |
| `paymentMethod` | "Payment Method" | "Metode Pembayaran" |
| `reference` | "Reference" | "Referensi" |
| `viewProof` | "View Proof" | "Lihat Bukti" |
| `paymentPending` | "Pending" | "Menunggu" |
| `paymentConfirmed` | "Confirmed" | "Dikonfirmasi" |
| `paymentRejected` | "Rejected" | "Ditolak" |
| `paymentRefunded` | "Refunded" | "Dikembalikan" |
| `partiallyPaid` | "Partially Paid" | "Sebagian Dibayar" |
| `invoicesForOrder` | "Invoices for this Order" | "Invoice untuk Order Ini" |
| `createFirstInvoice` | "Create your first invoice for this order" | "Buat invoice pertama untuk order ini" |
| `totalInvoiced` | "Total Invoiced" | "Total Invoice" |
| `lineType.product` | "Product" | "Produk" |
| `lineType.shipping` | "Shipping" | "Pengiriman" |
| `lineType.fee` | "Fee" | "Biaya" |
| `lineType.discount` | "Discount" | "Diskon" |
| `lineType.tax` | "Tax" | "Pajak" |

### 6.2 New Keys — `portal` Namespace

| Key | English | Indonesian |
|-----|---------|------------|
| `paymentProofUploaded` | "Payment proof uploaded" | "Bukti pembayaran terkirim" |
| `paymentRejected` | "Your payment was rejected" | "Pembayaran Anda ditolak" |
| `paymentConfirmed` | "Payment confirmed" | "Pembayaran dikonfirmasi" |

---

## Phase 7: PDF Template Updates

**File:** `src/features/documents/templates/invoice.tsx`

- Update line items table to show `lineType` column (or use visual differentiation: discounts in green/strikethrough, shipping with truck icon)
- Show payment status on the PDF if partially paid
- Include `partially_paid` status label

---

## Implementation Order

| Phase | What | Est. Effort | Dependencies |
|-------|------|-------------|--------------|
| **1** | DB migration: `payments` table + `line_type` column | 1 task | None |
| **2** | Model functions: payment CRUD, balance, `orderId` filter, `updateInvoice` | 2 tasks | Phase 1 |
| **3** | Server functions + Zod validation | 1 task | Phase 2 |
| **4** | Hooks + query keys | 1 task | Phase 3 |
| **5a** | Fix invoice list "Create" button | 0.5 task | None (can be done first) |
| **5b** | Fix portal payment proof upload bug | 0.5 task | None (can be done first) |
| **5c** | Order detail → invoice section | 1 task | Phase 4 |
| **5d** | Invoice detail → payment section | 1.5 tasks | Phase 4 |
| **5e** | Create invoice → pre-fill from URL params | 1 task | Phase 4 |
| **5f** | Portal → hide void invoices | 0.5 task | None |
| **6** | i18n keys (en + id) | 0.5 task | Parallel with any UI phase |
| **7** | PDF template updates | 0.5 task | Phase 1 |

---

## Out of Scope (Future Phases)

- **Credit memos / adjustments** — separate document types for refunds, write-offs
- **Multi-invoice payment allocation** — one payment covering multiple invoices
- **Invoice editing** — modify line items after creation (requires credit + reissue pattern)
- **Automated payment gateway integration** — Stripe, Midtrans, etc.
- **Email notifications** — send invoice to customer, notify on new invoice
- **Receipt / proof-of-payment PDF** — generate receipt after payment confirmed
- **AR aging report** — accounts receivable aging by customer
- **Multi-currency support** — currently IDR only

---

## File Change Summary

| File | Change |
|------|--------|
| `drizzle/schema.ts` | Add `payments` table, add `line_type` to `invoice_line_items` |
| `drizzle/0022_invoice_payments.sql` | New migration |
| `src/db/schema.ts` | Re-export updates |
| `src/features/invoices/model.ts` | New types, 7 new functions, 2 updated functions |
| `src/features/invoices/server.ts` | 6 new server functions, fix `listInvoicesFn` org resolution, add Zod schemas |
| `src/features/invoices/hooks.ts` | 8 new hooks |
| `src/lib/query-keys.ts` | Add `payments` and `balance` keys under `invoices` |
| `src/features/invoices/pages/invoice-list-page.tsx` | Add `primaryAction` to `PageHeader` |
| `src/features/invoices/pages/invoice-detail-page.tsx` | Add payment section, use shared hooks |
| `src/features/invoices/pages/create-invoice-page.tsx` | Pre-fill from URL params, payment method dropdown |
| `src/features/orders/pages/view-order-page.tsx` | Add invoice section with list + create button |
| `src/features/orders/hooks.ts` | Add `useInvoicesByOrderId` hook |
| `src/features/portal/pages/progress-view.tsx` | Fix duplicate insert bug |
| `src/features/portal/components/payment-section.tsx` | Hide void invoices |
| `src/messages/en.ts` | New invoice + portal keys |
| `src/messages/id.ts` | New invoice + portal keys |
| `src/features/documents/templates/invoice.tsx` | Line type display, partial payment status |

---

## Verification Checklist

After implementation:

- [ ] `bun run typecheck` passes
- [ ] `bun run check` passes
- [ ] `bun run build` passes
- [ ] Invoice list page shows "Create Invoice" button
- [ ] Invoice creation works from order detail (pre-filled)
- [ ] Invoice creation works standalone from invoice list
- [ ] Order detail shows invoices for approved orders
- [ ] Invoice detail shows payment history with confirm/reject
- [ ] Portal payment proof upload succeeds (no duplicate insert)
- [ ] Customer sees paid/partially_paid/unpaid status correctly in portal
- [ ] Void invoices hidden from portal
- [ ] PDF generates correctly with new line types
- [ ] All user-facing text uses i18n (no hardcoded strings)
