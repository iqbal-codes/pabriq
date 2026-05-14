# Invoice Feature Module — Scouting Report

## Files Retrieved

1. `src/features/invoices/model.ts` (all) — Data types + all DB-level functions
2. `src/features/invoices/model.test.ts` (all) — Vitest integration tests
3. `src/features/invoices/hooks.ts` (all) — TanStack React Query hooks
4. `src/features/invoices/server.ts` (all) — TanStack Start server functions
5. `src/features/invoices/pages/invoice-list-page.tsx` (all) — Invoice list page
6. `src/features/invoices/pages/create-invoice-page.tsx` (all) — Create invoice page
7. `src/features/invoices/pages/invoice-detail-page.tsx` (all) — Invoice detail page
8. `src/features/invoices/pages/payment-methods-page.tsx` (all) — Payment methods CRUD page

---

## 1. Data Types / Models

### Invoice Status
```ts
status: 'unpaid' | 'paid' | 'void'
```
Only three states — no `draft` state despite the i18n translation file including it.

### Core Types (all in `model.ts`)

| Type | Purpose |
|---|---|
| `Invoice` | Full invoice entity — includes `orderId`, `percentage` (for partial invoicing), `paidAt`, `paidBy` |
| `InvoiceLineItem` | Line item: `description`, `quantity`, `unitPrice`, `total`, `createdAt` |
| `PaymentMethod` | Payment destination: `type` (bank_transfer/payment_gateway), `bankName`, `accountNumber`, `accountHolder`, `instructions`, `isDefault`, `active` |
| `CreateInvoiceInput` | Input for create — either `orderId` + `percentage` (order-linked) or raw `lineItems[]` (standalone) |
| `CreateInvoiceResult` | Return: `{ invoice, lineItems }` |
| `InvoiceRow` | Flattened row for list view — includes computed `overdue: boolean` |
| `ListInvoicesParams` | Filters: `orgId`, `status?`, `q?`, `page?`, `perPage?` |
| `ListInvoicesResult` | `{ rows: InvoiceRow[], totalRows: number }` |
| `GetInvoiceResult` | `{ invoice, lineItems, paymentMethod }` |

### Key observations
- Invoices can be **standalone** (manual line items) or **order-linked** (derived from order line items with optional percentage)
- `percentage` field enables partial invoicing (e.g. invoice 50% of a $1000 order = $500)
- `overdue` is computed at query time via SQL, not stored
- No `deleteInvoice` function exists

---

## 2. Server Functions (server.ts)

| Function | Method | Status | Notes |
|---|---|---|---|
| `createInvoiceFn` | POST | ✅ Implemented | Auth + org resolution, calls `createInvoice()` |
| `getInvoiceFn` | GET | ✅ Implemented | Auth + org resolution, returns full detail |
| `listInvoicesFn` | GET | ✅ Implemented | Takes `ListInvoicesParams`, returns paginated list |
| `markInvoicePaidFn` | POST | ✅ Implemented | Auth + org + userId resolution |
| `voidInvoiceFn` | POST | ✅ Implemented | Auth + org resolution |
| `listPaymentMethodsFn` | GET | ✅ Implemented | Auth + org resolution, active only |
| `createPaymentMethodFn` | POST | ✅ Implemented | Auth + org resolution |
| `updatePaymentMethodFn` | POST | ✅ Implemented | Auth + org resolution |
| `deletePaymentMethodFn` | POST | ✅ Implemented | Auth + org resolution |

All server functions are fully implemented — no stubs.

**Potential issue:** `listInvoicesFn` does NOT call `resolveOrgId()` — it passes `data` directly to `listInvoices()`. The caller (hook) must supply `orgId`. This is inconsistent with every other server function which resolves orgId server-side.

**All functions use:** `.inputValidator()` with bare identity casts — no real Zod validation. E.g. `.inputValidator((input: CreateInvoiceInput) => input)`. This means runtime input validation is effectively a no-op.

---

## 3. Hooks Exported (hooks.ts)

| Hook | Query/Mutation | What it does |
|---|---|---|
| `useInvoicesList(filters)` | Suspense query | Lists invoices with filtering (status, search, pagination) |
| `useInvoice(id)` | Suspense query | Fetches single invoice detail with line items + payment method |
| `useCreateInvoice()` | Mutation | Creates invoice; invalidates all invoice queries on success |
| `usePaymentMethods()` | Suspense query | Lists active payment methods for current org |
| `useCreatePaymentMethod()` | Mutation | Creates payment method; invalidates payment methods cache |
| `useUpdatePaymentMethod()` | Mutation | Updates payment method; invalidates payment methods cache |
| `useDeletePaymentMethod()` | Mutation | Deletes payment method; invalidates payment methods cache |

**Missing hooks:** No `useMarkInvoicePaid()` or `useVoidInvoice()` — these mutations are defined directly in the detail page component instead (see below).

---

## 4. Page Features

### Invoice List Page (`invoice-list-page.tsx`) — ✅ Complete
- DataTable with columns: invoice number, customer, total (IDR), due date, status badge
- URL-based filtering via nuqs: `q` (search), `status`, `page`, `perPage`
- Row action: link to detail page via `<FileText>` icon
- Paginated with `totalRows` count
- Fully wired to `useInvoicesList` hook

### Create Invoice Page (`create-invoice-page.tsx`) — ⚠️ Partially Complete
- Form with customer fields (customerId, customerName, dueDate, paymentMethodId, notes)
- Dynamic line items array with add/remove
- Submits via `useCreateInvoice()` mutation
- **Issues:**
  - `customerId` and `customerName` are plain text fields — no customer picker/search
  - `paymentMethodId` is a plain text field — no dropdown of available payment methods
  - No support for order-linked invoices (no `orderId` or `percentage` fields in the form)
  - Hardcoded "Add Item" and "Description" / "Qty" strings — should use i18n

### Invoice Detail Page (`invoice-detail-page.tsx`) — ✅ Complete
- Shows invoice number, status badge, overdue badge
- Cards: customer name, total (IDR), due date, payment method details
- Line items table with qty, unit price, total
- Mark as paid + void buttons (visible only for unpaid invoices)
- **Issue:** Mutations for markPaid/voidInvoice are defined inline with `useMutation` instead of using a shared hook. Query invalidation uses raw `['invoices']` key which may not match the hook's query key pattern.

### Payment Methods Page (`payment-methods-page.tsx`) — ✅ Complete
- DataTable of payment methods with columns: type badge, bank name, account number (+ holder), default badge, active/inactive badge
- Add button opens Dialog with form
- Edit opens same Dialog pre-filled
- Delete shows AlertDialog confirmation
- Uses all four payment method hooks
- Type label mapping: `bank_transfer` → `t('bankTransfer')`, `payment_gateway` → `t('paymentGateway')`

---

## 5. TODOs, Empty Functions, Incomplete Logic

| Location | Issue | Severity |
|---|---|---|
| `server.ts` — `listInvoicesFn` | Does NOT call `resolveOrgId()`, relies on client-supplied `orgId` | Medium — inconsistent with all other server functions |
| `server.ts` — All `.inputValidator()` | Bare identity casts, no actual Zod validation | Medium — no runtime input safety |
| `create-invoice-page.tsx` | No order-linked invoice support (no orderId/percentage fields) | Low — standalone mode only for now |
| `create-invoice-page.tsx` | Customer and payment method fields are text inputs, not pickers | Low — poor UX but functional |
| `create-invoice-page.tsx` | Hardcoded strings: "Add Item", "Description", "Qty" | Low — i18n gap |
| `invoice-detail-page.tsx` | Inline mutations instead of shared hooks | Low — code organization |
| `invoice-detail-page.tsx` | Query invalidation uses `['invoices']` raw key | Medium — may not match `queryKeys.invoices.all` pattern |
| `model.ts` — `generateId()` | Uses `crypto.randomUUID()` — fine for Node 20+ | Info |
| `model.ts` | No `deleteInvoice` or `updateInvoice` functions | Info — may be intentional |
| `model.test.ts` | No test for `getInvoice` returning `null` when invoice doesn't exist | Low |
| `model.test.ts` | No test for `listInvoices` pagination (offset/limit behavior) | Low |
| `model.test.ts` | No test for `voidInvoice` on a void invoice (double-void) | Low |

---

## 6. Test Coverage (model.test.ts)

### What's tested ✅
| Test Suite | Cases |
|---|---|
| `createInvoice` | 1. Standalone invoice with line items 2. Order-linked invoice with percentage 3. Unique invoice numbers per org |
| `getInvoice` | 1. Returns invoice with line items + payment method 2. Returns null for wrong org |
| `listInvoices` | 1. Paginated list for org 2. Filters by status 3. Searches by invoice number or customer name |
| `markInvoicePaid` | 1. Marks unpaid as paid 2. Rejects already-paid invoices |
| `voidInvoice` | 1. Voids unpaid invoice 2. Rejects voiding paid invoices |
| `paymentMethods` | 1. Create + list 2. Update 3. Delete |

### What's missing ❌
| Missing | Why it matters |
|---|---|
| No test for order not found when `orderId` is invalid | `createInvoice` throws 'Order not found' |
| No test for `markInvoicePaid` on void invoice | Status check should reject |
| No test for `voidInvoice` on already-void invoice | Double-void scenario |
| No test for `listInvoices` pagination (page 2, offset behavior) | Pagination logic untested |
| No test for empty results (no invoices for org) | Edge case |
| No test for `generateInvoiceNumber` across year boundaries | Prefix includes year |
| No test for `listPaymentMethods` filtering by `active` | Only active methods returned |
| No `server.test.ts` file | Server function boundary (auth, org resolution) untested |
| No hook tests | React Query hooks not tested |

---

## Architecture — How Pieces Connect

```
Pages → Hooks (TanStack Query) → Server Functions (createServerFn) → Model (Drizzle DB)
```

1. **Pages** call hooks for data fetching (`useSuspenseQuery`) and mutations (`useMutation`)
2. **Hooks** wrap server functions with React Query caching/invalidation
3. **Server functions** resolve auth + org, then delegate to model functions
4. **Model** contains all Drizzle queries — the only place that touches the database

**Org resolution pattern:** All server functions except `listInvoicesFn` call `resolveOrgId()` server-side. `listInvoicesFn` passes the org through from the client, which is a security gap if the client can spoof it.

**Query keys:** Managed via `#/lib/query-keys` — `queryKeys.invoices.list()`, `queryKeys.invoices.detail()`, `queryKeys.invoices.paymentMethods()`, `queryKeys.invoices.all`

---

## Start Here

**`src/features/invoices/model.ts`** — This is the source of truth for all data types and database operations. Every other file depends on it. Understanding the Invoice/InvoiceLineItem/PaymentMethod types and the createInvoice dual-mode (standalone vs order-linked) is essential before touching any other file.
