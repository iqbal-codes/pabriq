# Code Context — Orders Feature Scout Report

## Files Retrieved

1. `src/features/orders/pages/orders-list-page.tsx` (lines 1-310) — Main orders list page with DataTable
2. `src/features/orders/model.ts` (lines 1-664+) — Orders model: types, DB queries, business logic
3. `src/features/orders/server.ts` (lines 1-310) — Server action functions wrapping model
4. `src/features/orders/hooks.ts` (lines 1-80) — React Query hooks for orders
5. `src/db/schema.ts` (lines 201-350) — Database table definitions (orders, invoices, payments)
6. `src/features/invoices/model.ts` (lines 1-200) — Invoices model, types
7. `src/components/app/data-table/data-table-utils.ts` (lines 95-100) — `AppColumnDef` type definition
8. `src/messages/id.ts` (lines 105-155) — Indonesian translations for orders
9. `src/messages/en.ts` (lines 105-155) — English translations for orders
10. `src/messages/types.ts` (lines 188-238) — TypeScript types for order messages
11. `src/features/portal/model.ts` (lines 35-65) — Portal `PortalInvoice` type showing invoice fields

---

## Key Code

### Current `OrderRow` type (src/features/orders/model.ts lines 105-115)
```typescript
export type OrderRow = {
  id: string
  customerName: string | null
  status: string
  total: number
  orderNumber: string | null
  orderToken: string | null
  createdAt: Date
}
```

### Current columns in the DataTable (src/features/orders/pages/orders-list-page.tsx lines 153-192)
```typescript
const columns: AppColumnDef<OrderRow>[] = [
  { accessorKey: 'orderNumber', header: t('orderNumber'), meta: { label: t('orderNumber'), mobileRole: 'title' } },
  { accessorKey: 'customerName', header: t('customer'), meta: { label: t('customer'), mobileRole: 'meta' }, cell: ... },
  { accessorKey: 'status', header: t('status'), meta: { label: t('status'), mobileRole: 'badge' }, cell: ... },
  { accessorKey: 'total', header: t('total'), meta: { label: t('total'), mobileRole: 'meta' }, cell: ... },
]
```

**Only 4 columns:** orderNumber, customerName, status, total.

### Orders DB table columns (src/db/schema.ts lines 201-230)
The `orders` table does **NOT** have `payment_status`, `due_date`, or any payment-related fields.

### Invoices DB table (src/db/schema.ts lines 303-330)
`invoices` table has:
- `status`: 'unpaid' | 'partially_paid' | 'paid' | 'void'
- `dueDate`: `date('due_date')`
- `total`, `subtotal`, `percentage`
- `orderId` — foreign key to orders table
- `paymentMethodId` — foreign key to payment methods

### Payments DB table (src/db/schema.ts lines 350-380)
`payments` table links to `invoiceId`, has `amount`, `status` (pending/confirmed/rejected/refunded).

### Current `listOrders` query (src/features/orders/model.ts lines 188-220)
The query joins `orders` + `customers` but does **NOT** join `invoices`. It returns:
```typescript
db.select({
  id: ordersTable.id,
  customerId: ordersTable.customerId,
  customerName: customersTable.name,
  status: ordersTable.status,
  total: ordersTable.total,
  orderNumber: ordersTable.orderNumber,
  orderToken: ordersTable.orderToken,
  createdAt: ordersTable.createdAt,
})
.from(ordersTable)
.leftJoin(customersTable, eq(ordersTable.customerId, customersTable.id))
```

### DataTable column pattern
`AppColumnDef<TData>` extends `ColumnDef<TData>` with `meta?: AppColumnMeta`. Each column has `accessorKey`, `header`, `meta: { label, mobileRole }`, and optionally a `cell` render function.

---

## Architecture

### Data flow for orders list
```
OrdersListPage
  └─ useOrdersList(filters)           # React Query hook
       └─ listOrdersFn({ data })      # Server function (GET)
            └─ listOrders(params)     # Model: DB query → OrderRow[]
                 └─ db.select.from(orders).leftJoin(customers)
```

### Key insight: Payment status lives in invoices, NOT orders
- One order can have **multiple invoices** (e.g., partial billing via percentages)
- Invoice `status` values: `unpaid`, `partially_paid`, `paid`, `void`
- The "payment status" for an order is derived from its invoices:
  - No invoices → `uninvoiced` (or no payment info)
  - All invoices paid → `paid`
  - Some paid, some unpaid → `partially_paid`
  - At least one overdue → `overdue`
- The "due date" for an order is the **earliest unpaid invoice's dueDate** (or the latest invoice's dueDate)

### Portal already has this pattern
`src/features/portal/model.ts` shows `PortalOrder` already computes `paymentStatus` and invoice info by querying invoices joined to orders.

---

## Start Here

**First file to edit:** `src/features/orders/model.ts`

This is where both the `OrderRow` type and the `listOrders` query live. You need to:

1. Add `paymentStatus` and `dueDate` fields to `OrderRow` type
2. Modify the `listOrders` SQL query to join `invoices` and aggregate payment info (subquery or left join with aggregation)
3. Add `dueDate` and `payment_status` to the `ALLOWED_SORT_FIELDS` set if sortable

Then follow with:
- `src/features/orders/pages/orders-list-page.tsx` — add 2 new columns
- `src/messages/id.ts`, `src/messages/en.ts`, `src/messages/types.ts` — add translation keys for new column headers

---

## Constraints & Risks

1. **One order → many invoices:** Payment status is aggregated. You'll need a subquery or a separate query to compute it. The portal model already does this — see `src/features/portal/model.ts` lines ~260-270 for reference.
2. **Performance:** If there are many orders, a correlated subquery per row could be slow. Consider a single aggregated join or a separate batch query.
3. **Existing sort fields:** `ALLOWED_SORT_FIELDS` currently has: `orderNumber`, `customerName`, `status`, `total`, `createdAt`. Adding `dueDate` requires the new field to map correctly in the sort logic.
4. **No existing `paymentStatus` in orders schema:** This is a computed/derived field, not stored in the DB.
5. **Translation keys needed:**
   - `paymentStatus` in the orders message namespace
   - `dueDate` in the orders message namespace (or reuse from invoices namespace which already has `dueDate`)
6. **Guest customers:** `customerName` is handled via `t('guestCustomer')` — no impact here.
