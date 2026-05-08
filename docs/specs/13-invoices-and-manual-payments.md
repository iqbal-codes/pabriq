# 13 — Invoices And Manual Payments

## Linked Issue

- GitHub #10: Slice 9 — Add invoices and manual bank transfer payments

## Goal

Track invoices and manual bank transfer payments without integrating a payment processor. Invoices are standalone (no order dependency) but carry a nullable `orderId` FK for progress billing — one order can have multiple invoices, each covering a percentage of the order total.

## Design Decisions

### Schema: drop and recreate

Existing `invoices` and `payments` tables (migration `0002_graceful_vampiro.sql`) are an early stub with mismatched schema. No real data exists. **Drop both tables and recreate** with the correct schema.

### No payments table

1 invoice = 1 payment. Payment info lives directly on the invoice row (`paid_at`, `paid_by`, `payment_method_id`). A separate `payments` table adds complexity for no benefit in v1 — progress billing tracks per-invoice payment, not per-order payment history.

### Percentage-based progress billing

- Order-linked invoices store a `percentage` field.
- `invoice_line_items` copy full order line items (quantities, unit prices) for reference.
- `subtotal` = sum of line items = the order's full amount.
- `total` = order total × percentage / 100 = what the customer actually pays.
- Standalone invoices (no order link): `percentage` is null, `subtotal` = `total`.
- Invoices are **immutable** after creation — corrections require void + recreate.

### Payment methods as org-scoped records

`payment_methods` table replaces free-text `payment_instructions`. Each row represents a bank account or payment gateway the org manages. Admins CRUD them in Settings.

### State machine

```
                ┌──────────┐
                │  unpaid  │
                └────┬─────┘
              ┌──────┼──────┐
              │      │      │
              ▼      ▼      ▼
         (pending) ┌──────┐ ┌──────┐
         computed  │ paid │ │ void │
         (proof    └──────┘ └──────┘
          uploaded)
```

From | To | Trigger | Guard
---|---|---|---
`unpaid` | `paid` | Admin marks paid | Can override even without proof
`unpaid` | `void` | Void invoice | None
`paid` | — | Terminal | —
`void` | — | Terminal | —

**Pending payment** is a computed label — shown in UI when `status = 'unpaid'` AND a payment proof asset exists. No separate status value.

**Overdue** is also computed — `status = 'unpaid'` AND `due_date < today`.

## Data Model

### `payment_methods` table

| Column | Type | Constraints |
|---|---|---|
| `id` | `text` | PK |
| `org_id` | `text` | FK → `organization.id`, NOT NULL |
| `name` | `text` | Display name, NOT NULL |
| `type` | `text` | `bank_transfer` or `payment_gateway`, NOT NULL |
| `bank_name` | `text` | Nullable |
| `account_number` | `text` | Nullable |
| `account_holder` | `text` | Nullable |
| `instructions` | `text` | Nullable — free-text extra info |
| `is_default` | `boolean` | Default `false`, one per org |
| `active` | `boolean` | Default `true` |
| `created_at` | `timestamptz` | NOT NULL |
| `updated_at` | `timestamptz` | NOT NULL |

### `invoices` table

| Column | Type | Constraints |
|---|---|---|
| `id` | `text` | PK |
| `org_id` | `text` | FK → `organization.id`, NOT NULL |
| `invoice_number` | `text` | NOT NULL, unique per org |
| `order_id` | `text` | FK → `orders.id`, **nullable** |
| `customer_id` | `text` | FK → `customers.id`, NOT NULL |
| `customer_name` | `text` | Denormalised snapshot at creation |
| `status` | `text` | NOT NULL, one of: `unpaid`, `paid`, `void` |
| `percentage` | `real` | Nullable — null for standalone, 0-100 for order-linked |
| `subtotal` | `real` | NOT NULL — sum of line items (full order amount if linked) |
| `total` | `real` | NOT NULL — for order-linked: order_total × percentage / 100; for standalone: = subtotal |
| `due_date` | `date` | NOT NULL |
| `issued_date` | `date` | NOT NULL, default `CURRENT_DATE` |
| `payment_method_id` | `text` | FK → `payment_methods.id`, nullable |
| `paid_at` | `timestamptz` | Nullable — set when admin marks paid |
| `paid_by` | `text` | Nullable — admin user ID |
| `notes` | `text` | Nullable |
| `created_at` | `timestamptz` | NOT NULL |
| `updated_at` | `timestamptz` | NOT NULL |

Index: unique composite `(org_id, invoice_number)`.

### `invoice_line_items` table

| Column | Type | Constraints |
|---|---|---|
| `id` | `text` | PK |
| `invoice_id` | `text` | FK → `invoices.id`, NOT NULL |
| `description` | `text` | NOT NULL |
| `quantity` | `integer` | NOT NULL, > 0 |
| `unit_price` | `real` | NOT NULL |
| `total` | `real` | NOT NULL |
| `created_at` | `timestamptz` | NOT NULL |

## Server Functions

### Admin server functions

All admin functions require org-scoped auth (owner/admin role, same pattern as customers/products/orders).

**`createInvoice(input)`** — `POST`
```
input: {
  orderId?: string
  customerId: string
  customerName: string
  lineItems: Array<{ description: string; quantity: number; unitPrice: number }>
  percentage?: number            // required if orderId set
  dueDate: string
  issuedDate?: string
  paymentMethodId: string
  notes?: string
}
output: Invoice
```
- Generates `invoice_number` in format `INV-{YYYY}-{NNNN}` (per-org sequence).
- If `orderId` set: validates order exists + is approved, copies order line items (full amounts), calculates `total = order.total × percentage / 100`.
- If standalone: line items as provided, `subtotal = total = sum(lineItems.total)`.
- Sets `status = 'unpaid'`.

**`getInvoice(id)`** — `GET`

Returns invoice + line items + payment method, or null.

**`listInvoices(orgId, filters?)`** — `GET`
```
filters: { status?: string; q?: string; page?: number; perPage?: number }
output: { rows: InvoiceRow[], totalRows: number }
```
`InvoiceRow` includes: id, invoiceNumber, customerName, status, total, dueDate, percentage, computed overdue flag.

**`markInvoicePaid(invoiceId)`** — `POST`
- Validates invoice exists and is `unpaid`.
- Sets `status = paid`, `paid_at = now()`, `paid_by = currentUserId`.
- Can be called regardless of whether payment proof exists (admin override).
- Returns updated invoice.

**`voidInvoice(invoiceId)`** — `POST`
- Validates invoice is `unpaid`.
- Sets `status = void`.
- Returns updated invoice.

**`getPaymentMethods(orgId)`** — `GET`
- Returns active payment methods for the org.
- Default method is first in list.

**`createPaymentMethod(input)`**, **`updatePaymentMethod(id, input)`**, **`deletePaymentMethod(id)`** — CRUD for Settings page.

### Portal server functions (token-authenticated)

**`getPortalInvoices(token)`** — `GET`
- Resolves order by token.
- Returns invoices where `order_id = order.id AND status = 'unpaid'`.
- Each invoice includes payment method details.

**`submitPaymentProof(token, invoiceId, assetId)`** — `POST`
- Resolves order by token, validates invoice belongs to that order.
- Creates/links an asset with `ownerType = 'invoice'`, `usage = 'payment_proof'`, `ownerId = invoiceId`.
- Invoice status stays `unpaid` but UI shows "Pending confirmation".

## Routes & UI

### Admin routes

| Path | Component | Purpose |
|---|---|---|
| `/invoices` | `InvoiceList` | DataTable with columns: Invoice #, Customer, Total, Due Date, Percentage, Status (badge), Overdue (warning badge). Row links to detail. Status filter + text search. |
| `/invoices/new` | `CreateInvoice` | Form: customer select, dynamic line items (description/qty/unitPrice auto-total), due date picker, optional order select (approved orders), percentage field (shown when order selected → auto-computes total), payment method radio (default pre-selected), notes textarea. |
| `/invoices/$id` | `InvoiceDetail` | Invoice header with status badge, line items read-only table, payment method info + bank details. If unpaid: "Mark as Paid" button (with confirmation), "Void" button (with confirmation). Shows payment proof asset if exists. |

### Settings route

| Path | Component | Purpose |
|---|---|---|
| `/settings/payment-methods` | `PaymentMethodsPage` | CRUD table: name, type, bank name, account number, account holder, active toggle, default checkbox. New tab in existing settings layout. |

### Portal (customer token page)

When a customer visits `/order/$token` and the order status is `approved` (or beyond):

1. Invoice section renders below existing order content
2. Shows: invoice total, percentage, due date, overdue badge
3. Shows payment method bank details
4. "Download Invoice" link → `/api/documents/invoices/token/$token/pdf`
5. "Upload Payment Proof" button → file picker → R2 upload → confirm
6. After proof submitted: badge changes to "Pending confirmation"
7. Admin marks paid from admin panel → portal shows "Paid" badge

### UI Details

- **Invoice list**: DataTable with status filter, text search, overdue badges. Columns: Invoice #, Customer, Total, Due Date, % (if order-linked), Status.
- **Create form**: Customer select, dynamic line items, due date picker, optional order select (only approved orders), percentage field, payment method radio group, notes.
- **Detail page**: Invoice header with status badge, line items table, payment method details, Mark as Paid button (confirmation dialog, only if unpaid), Void button (confirmation, only if unpaid). Payment proof asset display if exists.
- **Overdue display**: Red/orange badge in lists and detail when `status = 'unpaid'` and `due_date < today`.
- **Pending payment display**: Yellow/info badge when `status = 'unpaid'` and payment proof asset exists.

## PDF Generation

Reuses existing `@react-pdf/renderer` infrastructure (see quotation PDF).

**Invoice PDF template**: `src/features/documents/templates/invoice.tsx`
- Org name, invoice number, issued date, due date
- Customer name
- Line items table (description, qty, unit price, total)
- Subtotal, percentage (if order-linked), total
- Payment method bank details
- "Already paid" info: if order-linked and other invoices are paid, shows total paid so far

**API routes:**
- `/api/documents/invoices/$id/pdf` — admin-authenticated (same pattern as quotation)
- `/api/documents/invoices/token/$token/pdf` — token-authenticated (customer portal)

## Payment Proof Flow

**Customer (portal):**
1. Upload via existing R2 flow (`portalGetUploadUrlFn` / `portalFinalizeUploadFn`)
2. `submitPaymentProofFn` creates asset with `ownerType='invoice'`, `usage='payment_proof'`, `ownerId=invoiceId`
3. Status stays `unpaid`, UI shows "Pending confirmation"

**Admin (invoice detail):**
1. Sees payment proof asset (download/preview link)
2. "Mark as Paid" button works with or without proof
3. Paid invoice shows `paid_at` date and `paid_by` admin name

## Permissions

All invoice and payment method actions restricted to org-scoped admin/owner role.

| Action | Required Membership |
|---|---|
| Create invoice | Org admin/owner |
| View invoice (list + detail) | Org admin/owner |
| Mark invoice paid | Org admin/owner |
| Void invoice | Org admin/owner |
| Manage payment methods (CRUD) | Org admin/owner |
| Download invoice PDF (admin) | Org admin/owner |
| Download invoice PDF (portal) | Token-based (public) |
| Submit payment proof | Token-based (public) |

## Acceptance Criteria

- Admins can create invoices with line items, customer, due date, payment method, optional order link with percentage.
- Admins can mark invoices paid (with or without payment proof).
- Invoice status transitions: `unpaid → paid` or `unpaid → void`. `paid` and `void` are terminal.
- Invoice number auto-increments per org: `INV-2026-0001`, `INV-2026-0002`, ...
- Overdue badge displays when due date is past and status is `unpaid`.
- Payment proof upload via customer portal (token page).
- Order-linked invoices: line items show full order items, total = percentage of order total.
- One order can have multiple invoices (progress billing).
- Payment methods CRUD in Settings with bank account details.
- Invoice PDF downloadable from admin panel and customer portal.
- Pending payment label shows when proof uploaded but not yet confirmed.
- Org isolation: all data scoped to org.

## Out Of Scope

- Stripe, card payments, payment webhooks, refunds, automatic reconciliation.
- Tax, discounts, currency conversion.
- Email delivery of invoices.
- Recurring invoices.
- Scheduler/background job for overdue marking.
- Multiple payments per invoice (1:1 only in v1).
- Auto-generate invoice when order is approved.
