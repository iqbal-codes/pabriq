# Invoice Database Schema & Data Layer Analysis

## Files Examined

| File | Lines | Why |
|------|-------|-----|
| `drizzle/schema.ts` | full | Canonical Drizzle schema (authoritative) |
| `drizzle/relations.ts` | full | Relational definitions |
| `src/db/schema.ts` | full | Re-exported schema (diverges from drizzle/schema.ts) |
| `src/features/invoices/model.ts` | full | Data access layer queries |
| `src/features/invoices/server.ts` | full | Server functions (TanStack Start) |
| `src/features/invoices/hooks.ts` | full | React Query hooks |
| `drizzle/0019_invoices_redo.sql` | full | Migration that created current invoice tables |

---

## 1. Invoice-Related Database Tables

### `invoices` table

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | text | NOT NULL | — | PK, UUID |
| `org_id` | text | NOT NULL | — | FK → organization(id), ON DELETE CASCADE |
| `invoice_number` | text | NOT NULL | — | Unique per org via composite index |
| `order_id` | text | NULL | — | FK → orders(id), ON DELETE SET NULL |
| `customer_id` | text | NOT NULL | — | FK → customers(id), ON DELETE RESTRICT |
| `customer_name` | text | NOT NULL | — | Denormalized snapshot |
| `status` | text | NOT NULL | `'unpaid'` | Values: `unpaid`, `paid`, `void` |
| `percentage` | real | NULL | — | For partial invoices against orders |
| `subtotal` | real | NOT NULL | — | Sum of line item totals |
| `total` | real | NOT NULL | — | `order.total * (percentage / 100)` or equals subtotal for standalone |
| `due_date` | date | NOT NULL | — | |
| `issued_date` | date | NOT NULL | `CURRENT_DATE` | |
| `payment_method_id` | text | NULL | — | FK → payment_methods(id), ON DELETE SET NULL |
| `paid_at` | timestamp | NULL | — | Set when marked paid |
| `paid_by` | text | NULL | — | User ID who marked as paid |
| `notes` | text | NULL | — | |
| `created_at` | timestamp | NOT NULL | `now()` | |
| `updated_at` | timestamp | NOT NULL | `now()` | |

**Indexes:**
- PK: `id` (implicit)
- Unique: `idx_invoices_org_number` on `(org_id, invoice_number)` — ensures invoice numbers are unique per organization

### `invoice_line_items` table

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | text | NOT NULL | — | PK, UUID |
| `invoice_id` | text | NOT NULL | — | FK → invoices(id), ON DELETE CASCADE |
| `description` | text | NOT NULL | — | |
| `quantity` | integer | NOT NULL | — | |
| `unit_price` | real | NOT NULL | — | |
| `tax_percent` | real | NOT NULL | `0` | **Exists in DB but NOT in model types** |
| `total` | real | NOT NULL | — | |
| `created_at` | timestamp | NOT NULL | `now()` | |

**Indexes:**
- PK: `id` (implicit)

### `payment_methods` table

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | text | NOT NULL | — | PK, UUID |
| `org_id` | text | NOT NULL | — | FK → organization(id), ON DELETE CASCADE |
| `name` | text | NOT NULL | — | |
| `type` | text | NOT NULL | `'bank_transfer'` | |
| `bank_name` | text | NULL | — | |
| `account_number` | text | NULL | — | |
| `account_holder` | text | NULL | — | |
| `instructions` | text | NULL | — | |
| `is_default` | boolean | NOT NULL | `false` | |
| `active` | boolean | NOT NULL | `true` | |
| `created_at` | timestamp | NOT NULL | `now()` | |
| `updated_at` | timestamp | NOT NULL | `now()` | |

**Indexes:**
- PK: `id` (implicit)

---

## 2. Foreign Key Relationships

```
organization (1) ────┬──── (N) invoices [ON DELETE CASCADE]
                     │
orders (1) ──────────┼──── (N) invoices [ON DELETE SET NULL]
                     │
customers (1) ───────┼──── (N) invoices [ON DELETE RESTRICT]
                     │
payment_methods (1) ─┴──── (N) invoices [ON DELETE SET NULL]

invoices (1) ──── (N) invoice_line_items [ON DELETE CASCADE]
```

**Relational mappings** (from `drizzle/relations.ts`):
- `invoicesRelations`: `one(organization)`, `one(orders)`, `one(customers)`, `one(paymentMethods)`, `many(invoiceLineItems)`
- `invoiceLineItemsRelations`: `one(invoices)`
- `organizationRelations`: `many(invoices)`, `many(invoiceLineItems)`
- `ordersRelations`: `many(invoices)`
- `customersRelations`: `many(invoices)`

---

## 3. Enums / Status Values

**No PgEnum types are defined.** Status is stored as plain `text()` with runtime enforcement in application code.

| Field | Domain Values | Source |
|-------|--------------|--------|
| `invoices.status` | `'unpaid'` (default), `'paid'`, `'void'` | Model type: `Invoice.status` literal union |
| `payment_methods.type` | `'bank_transfer'` (default), others possible | DB default only, no validation |

The `Invoice` TypeScript type in `model.ts:17` defines:
```ts
status: 'unpaid' | 'paid' | 'void'
```

---

## 4. Queries Implemented vs Missing

### Implemented

| Operation | Function | Server Fn | Hook |
|-----------|----------|-----------|------|
| **Create** invoice | `createInvoice()` | `createInvoiceFn` | `useCreateInvoice()` |
| **Get** single invoice | `getInvoice()` | `getInvoiceFn` | `useInvoice()` |
| **List** invoices (paginated, filtered) | `listInvoices()` | `listInvoicesFn` | `useInvoicesList()` |
| **Mark paid** | `markInvoicePaid()` | `markInvoicePaidFn` | ❌ No hook |
| **Void** | `voidInvoice()` | `voidInvoiceFn` | ❌ No hook |
| **Create** payment method | `createPaymentMethod()` | `createPaymentMethodFn` | `useCreatePaymentMethod()` |
| **List** payment methods | `listPaymentMethods()` | `listPaymentMethodsFn` | `usePaymentMethods()` |
| **Update** payment method | `updatePaymentMethod()` | `updatePaymentMethodFn` | `useUpdatePaymentMethod()` |
| **Delete** payment method | `deletePaymentMethod()` | `deletePaymentMethodFn` | `useDeletePaymentMethod()` |

### Missing

| Missing Operation | Notes |
|-------------------|-------|
| **Update/edit invoice** | No `updateInvoice()` function. Cannot modify line items, notes, due date, or payment method after creation |
| **Delete invoice** | No `deleteInvoice()` function. Only `void` (soft state change to `'void'`) is available |
| **Invoice summary/dashboard stats** | No total outstanding, total paid, count-by-status queries |
| **List invoices by customer** | No dedicated query to fetch all invoices for a specific customer |
| **List invoices by order** | No dedicated query to fetch all invoices linked to an order |
| **Unpaid/overdue count** | The `listInvoices` query computes `overdue` per-row but has no aggregate endpoint |
| **markInvoicePaid / voidInvoice hooks** | These mutations exist as server functions but have no React Query hooks — they're called directly from the detail page inline |

---

## 5. Missing Indexes & Constraints

### Missing Indexes

| Column | Why Needed | Current State |
|--------|-----------|---------------|
| `invoices.customer_id` | Filtering by customer | ❌ No index |
| `invoices.order_id` | Filtering by order, JOINs | ❌ No index |
| `invoices.status` | Filtering by status in `listInvoices` | ❌ No index |
| `invoices.due_date` | Overdue detection, sorting by due date | ❌ No index |
| `invoices.payment_method_id` | JOINs with payment_methods | ❌ No index |
| `invoice_line_items.invoice_id` | JOIN in `getInvoice` (already has FK but no explicit index) | FK exists, PG auto-indexes FK in many cases but not guaranteed |
| `payment_methods.org_id` | Filtering by org in `listPaymentMethods` | ❌ No index |

### Missing Constraints

| Constraint | Why Needed |
|------------|-----------|
| **CHECK on `invoices.status`** | Currently allows any string value. Should be `CHECK (status IN ('unpaid', 'paid', 'void'))` |
| **CHECK on `invoices.total >= 0`** | Negative totals shouldn't be possible |
| **CHECK on `invoices.subtotal >= 0`** | Same |
| **CHECK on `invoice_line_items.quantity > 0`** | Zero/negative quantities are nonsensical |
| **CHECK on `invoice_line_items.unit_price >= 0`** | Negative prices shouldn't be allowed |
| **CHECK on `invoice_line_items.tax_percent BETWEEN 0 AND 100`** | Tax outside this range is invalid |

---

## 6. Schema vs Feature Module Gaps

### Schema Divergence: `drizzle/schema.ts` vs `src/db/schema.ts`

The two schema files differ. `src/db/schema.ts` is the more complete/evolved version:

| Table | `src/db/schema.ts` has extra columns | `drizzle/schema.ts` missing |
|-------|--------------------------------------|----------------------------|
| `customers` | `photoAssetId` (FK → assets) | ❌ Missing |
| `orders` | `orderNumber`, `orderToken`, `approvedAt`, `approvedBy`, `rejectedAt`, `rejectedBy`, `rejectReason`, `courier`, `trackingNumber`, `shippedAt`, `deliveredAt` | ❌ Missing |
| `products` | `primaryImageAssetId`, `basePrice`, `productionDays`, `minQuantity`, `maxQuantity`, `pricingMode` | ❌ Missing |
| `orderLineItems` | `name`, `assetId` | ❌ Missing |
| `productionStages` | Entire table exists in `src/db/schema.ts` | ❌ Missing entirely |
| `productionTasks` | Extra columns: `board`, `taskNumber`, `lineItemId`, `archivedAt`, different `context` type | ❌ Different |
| `taskActivity` | Entire table | ❌ Missing entirely |

**Note:** The model file (`src/features/invoices/model.ts`) imports from `#/db/schema` (i.e., `src/db/schema.ts`), so at runtime it uses the more complete schema. However, `drizzle/schema.ts` may be the one used for migrations, creating a drift risk.

### Type Gaps in `model.ts`

**`InvoiceLineItem` type** (model.ts:32-39) is missing the `taxPercent` column that exists in the database:
```ts
// In model.ts:
export type InvoiceLineItem = {
  id: string
  invoiceId: string
  description: string
  quantity: number
  unitPrice: number
  total: number       // ← missing taxPercent
  createdAt: Date
}
```
The DB schema defines `tax_percent real NOT NULL DEFAULT 0` but the type omits it. The `createInvoice` function also doesn't populate it.

### `InvoiceRow` type uses `status: string` instead of the discriminated union

```ts
export type InvoiceRow = {
  // ...
  status: string   // ← should be 'unpaid' | 'paid' | 'void'
  // ...
}
```
The full `Invoice` type has the correct union, but `InvoiceRow` (used in list views) falls back to `string`.

### `CreateInvoiceInput` missing `taxPercent`

The `CreateInvoiceInput.lineItems` type has no `taxPercent` field:
```ts
lineItems: Array<{
  description: string
  quantity: number
  unitPrice: number
  // ← no taxPercent
}>
```

### Hooks missing for `markInvoicePaid` and `voidInvoice`

These mutations are called directly in `invoice-detail-page.tsx` with inline `useMutation` instead of using a shared hook like `useMarkInvoicePaid()`. This is a minor DRY concern.

---

## 7. Summary: Start Here

**Open `src/features/invoices/model.ts`** — it's the single source of truth for invoice data operations. It imports from `#/db/schema` (i.e., `src/db/schema.ts`), contains all query functions, type definitions, and business logic (invoice number generation, paid/void state transitions).

The most impactful gaps to address:
1. **No edit/update invoice** — once created, invoices can only be marked paid or voided
2. **No delete invoice** — cannot remove erroneous invoices, only void them
3. **Missing indexes** on `status`, `due_date`, `customer_id` for list/filter performance
4. **No CHECK constraints** on status values or numeric ranges
5. **`taxPercent` column** exists in DB but is ignored by the application layer
6. **Schema drift** between `drizzle/schema.ts` and `src/db/schema.ts` needs reconciliation
