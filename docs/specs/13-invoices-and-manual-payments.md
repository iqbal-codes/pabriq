# 13 — Invoices And Manual Payments

## Linked Issue

- GitHub #10: Slice 9 — Add invoices and manual bank transfer payments

## Goal

Track invoices and manual bank transfer payments without integrating a payment processor. Invoices are standalone (no order dependency) but carry a nullable `orderId` FK for future order-lifecycle integration.

## Design Decision

Invoices are **order-agnostic but co-exist** with orders.

- `invoices.orderId` is a **nullable** FK to `orders`. It's `null` for standalone invoices and populated when an invoice is linked to an approved order (future).
- All invoice CRUD, state transitions, payment recording, and overdue detection work independently of the order lifecycle module.
- The invoice list, detail, customer token payment instructions, and org isolation are self-contained.

## Data Model

### `invoices` table

| Column | Type | Constraints |
|---|---|---|
| `id` | `uuid` | PK, default `gen_random_uuid()` |
| `org_id` | `uuid` | FK → `organization.id`, NOT NULL |
| `invoice_number` | `text` | NOT NULL, unique per org |
| `order_id` | `uuid` | FK → `orders.id`, **nullable** |
| `customer_id` | `uuid` | FK → `customers.id`, NOT NULL |
| `customer_name` | `text` | Denormalised snapshot at creation |
| `status` | `text` | NOT NULL, one of: `unpaid`, `partially_paid`, `paid`, `void` |
| `subtotal` | `numeric(12,2)` | NOT NULL |
| `total` | `numeric(12,2)` | NOT NULL |
| `due_date` | `date` | NOT NULL |
| `issued_date` | `date` | NOT NULL, default `CURRENT_DATE` |
| `notes` | `text` | Nullable |
| `payment_instructions` | `text` | Nullable — free-text bank details etc. |
| `created_at` | `timestamptz` | NOT NULL |
| `updated_at` | `timestamptz` | NOT NULL |

Index: unique composite `(org_id, invoice_number)`.

### `invoice_line_items` table

| Column | Type | Constraints |
|---|---|---|
| `id` | `uuid` | PK |
| `invoice_id` | `uuid` | FK → `invoices.id`, NOT NULL |
| `description` | `text` | NOT NULL |
| `quantity` | `integer` | NOT NULL, > 0 |
| `unit_price` | `numeric(12,2)` | NOT NULL |
| `total` | `numeric(12,2)` | NOT NULL |
| `created_at` | `timestamptz` | NOT NULL |

### `payments` table

| Column | Type | Constraints |
|---|---|---|
| `id` | `uuid` | PK |
| `invoice_id` | `uuid` | FK → `invoices.id`, NOT NULL |
| `amount` | `numeric(12,2)` | NOT NULL, > 0 |
| `payment_date` | `date` | NOT NULL, default `CURRENT_DATE` |
| `reference` | `text` | Nullable — e.g. transfer receipt no. |
| `notes` | `text` | Nullable |
| `created_at` | `timestamptz` | NOT NULL |

## Invoice State Machine

**Status field** stores the base state. **Overdue** is a computed label — shown in UI when status is `unpaid` or `partially_paid` and `due_date < today`.

```
                ┌──────────┐
                │  unpaid  │
                └────┬─────┘
              ┌──────┼──────────┐
              │      │          │
              ▼      ▼          ▼
    ┌────────────┐ ┌──────┐ ┌──────┐
    │partially   │ │ paid │ │ void │
    │paid        │ └──────┘ └──────┘
    └─────┬──────┘
          │
          ▼
      ┌──────┐
      │ paid │
      └──────┘
```

| From | To | Trigger | Guard |
|---|---|---|---|
| `unpaid` | `paid` | Record payment ≥ total | Payment amount must cover remaining balance |
| `unpaid` | `partially_paid` | Record payment < total | Payment > 0 |
| `unpaid` | `void` | Void invoice | None |
| `partially_paid` | `paid` | Record payment covering remainder | Cumulative payments = total |
| `partially_paid` | `void` | Void invoice | Only if admin confirms (allows partial-payment + void, no refund logic — out of scope) |
| `paid` | — | Terminal | No transitions out |
| `void` | — | Terminal | No transitions out |

**Overdue (computed):** If `status IN ('unpaid','partially_paid')` and `due_date < today`, UI shows overdue badge. No separate status transition needed.

## Server Functions

### `createInvoice(input)` — `POST`

```
input: {
  orderId?: string           // optional link
  customerId: string
  customerName: string
  lineItems: Array<{
    description: string
    quantity: number
    unitPrice: number
  }>
  dueDate: string             // ISO date
  issuedDate?: string         // defaults to today
  notes?: string
  paymentInstructions?: string
}
output: Invoice              // includes line items, status = 'unpaid'
```

- Generates `invoice_number` in format `INV-{YYYY}-{NNNN}` (per-org sequence).
- Calculates `subtotal = sum(lineItems.total)`, `total = subtotal` (no tax/discount in v1).
- Sets `status = 'unpaid'`.

### `getInvoice(id)` — `GET`

Returns invoice + line items + payment history, or null.

### `listInvoices(orgId, filters?)` — `GET`

```
filters: {
  status?: string
  q?: string                  // search invoiceNumber or customerName
  page?: number
  perPage?: number
}
output: { rows: InvoiceRow[], totalRows: number }
```

`InvoiceRow` includes: id, invoiceNumber, customerName, status, total, dueDate, computed overdue flag.

### `recordPayment(invoiceId, amount, paymentDate?, reference?, notes?)` — `POST`

- Validates invoice exists and is not `paid` or `void`.
- Creates payment record.
- Recalculates invoice status:
  - Sum of all payments ≥ total → `paid`
  - Sum > 0 and < total → `partially_paid`
- Returns updated invoice + new payment.

### `voidInvoice(invoiceId)` — `POST`

- Validates invoice is not already `paid` or `void`.
- Sets status to `void`.
- Returns updated invoice.

## Routes & UI

| Path | Component | Purpose |
|---|---|---|
| `/invoices` | `InvoiceList` | Data table with status filter, search, overdue badges |
| `/invoices/new` | `CreateInvoice` | Form: select customer, add line items (description/qty/price), set due date, optional orderId, notes, payment instructions |
| `/invoices/$id` | `InvoiceDetail` | Invoice header, line items table, payment history table, record-payment form, void button |
| On order detail (`/orders/$id`) | Badge/block | When invoice exists, show link + state. (Future — add when order detail page exists) |
| Customer token page | Payment instructions block | If order has an invoice with `payment_instructions`, render them. |

### UI Details

- **Invoice list**: DataTable with columns: Invoice #, Customer, Total, Due Date, Status (badge), Overdue (warning badge if applicable). Row links to detail page.
- **Create form**: Customer select, dynamic line items (description, qty, unit price auto-calculates total), due date picker, optional order ID select, notes textarea, payment instructions textarea.
- **Detail page**: Invoice header with status badge, line items read-only table, payment history table (or empty state), "Record Payment" form (amount, date, reference, notes), "Void Invoice" button (with confirmation dialog, disabled if paid/void).
- **Overdue display**: In lists and detail, show a red/orange "Overdue" badge when computed condition is true.

## Permissions

All invoice and payment actions restricted to org-scoped admin role (same pattern as customers/products/orders).

| Action | Required Membership |
|---|---|
| Create invoice | Org admin |
| View invoice | Org admin (list + detail) |
| Record payment | Org admin |
| Void invoice | Org admin |

## Payment Instructions on Customer Token Page

When a customer visits `/order/$token`:

1. Token resolves to an order.
2. If that order has an invoice (via `invoices.orderId`) AND that invoice has non-empty `payment_instructions`, render a "Payment" section at the bottom of the page with the instructions text.
3. This is additive — no change to existing token page behaviour when no invoice exists.

## Acceptance Criteria

- Admins can create invoices with line items, customer, due date, and optional order link.
- Admins can record manual bank transfer payments against an invoice.
- Invoice status transitions correctly: unpaid → partially_paid → paid, or unpaid → void, partially_paid → void.
- Overdue badge displays when due date is past and status is unpaid/partially_paid.
- Payment history is visible on invoice detail.
- Invoice list is org-scoped with filtering by status and text search.
- Customer token page shows payment instructions when the linked order has an invoice with instructions.
- Invoice number auto-increments per org (`INV-2026-0001`, `INV-2026-0002`, …).
- Invoice creation, payment recording, and void are idempotent-safe.

## Out Of Scope (unchanged)

- Stripe, card payments, payment webhooks, refunds, automatic reconciliation.
- Tax, discounts, currency conversion.
- Email delivery of invoices.
- Recurring invoices.
- Scheduler/background job for overdue marking.
