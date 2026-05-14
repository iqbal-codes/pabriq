# Invoice Routes & API — Scout Report

## 1. Routes That Exist

### UI Routes (file-based TanStack Router)

| Route | File | Component | Purpose |
|-------|------|-----------|---------|
| `/_org/invoices/` | `src/routes/_org/invoices/index.tsx` | `InvoiceListPage` | Invoice list (data table with search, pagination, status filter) |
| `/_org/invoices/new` | `src/routes/_org/invoices/new.tsx` | `CreateInvoicePage` | Create a new invoice |
| `/_org/invoices/$id/` | `src/routes/_org/invoices/$id/index.tsx` | `InvoiceDetailPage` | View invoice detail, mark paid, void |

### API Endpoints (server-only)

| Route | File | Method | Purpose |
|-------|------|--------|---------|
| `/api/documents/invoices/$id/pdf` | `src/routes/api/documents/invoices/$id/pdf.ts` | GET | Generate PDF for an invoice (authenticated) |
| `/api/documents/invoices/token/$token` | `src/routes/api/documents/invoices/token/$token.ts` | GET | Generate PDF via public order token (no auth) |
| `/api/documents/orders/$id/quotation` | `src/routes/api/documents/orders/$id/quotation.ts` | GET | Generate quotation PDF (for reference) |

### Server Functions (TanStack `createServerFn`, in `src/features/invoices/server.ts`)

| Function | Method | Purpose |
|----------|--------|---------|
| `createInvoiceFn` | POST | Create invoice |
| `getInvoiceFn` | GET | Fetch single invoice |
| `listInvoicesFn` | GET | List invoices (paginated) |
| `markInvoicePaidFn` | POST | Mark invoice as paid |
| `voidInvoiceFn` | POST | Void an invoice |
| `listPaymentMethodsFn` | GET | List org payment methods |
| `createPaymentMethodFn` | POST | Create payment method |
| `updatePaymentMethodFn` | POST | Update payment method |
| `deletePaymentMethodFn` | POST | Delete payment method |

---

## 2. Missing Routes

### Definitely Missing

| Missing Route | Suggested Path | Notes |
|---------------|----------------|-------|
| **Edit invoice** | `/_org/invoices/$id/edit` | No edit route exists. Invoice detail page only has mark-paid/void actions. |
| **Preview invoice (browser)** | `/_org/invoices/$id/preview` | No browser-based PDF preview. The PDF endpoints return raw PDF bytes but there's no UI page to embed them. |
| **Print invoice** | Could share `/preview` with `window.print()` | No dedicated print route. |
| **Download PDF action** | — | No download link/button on the detail page; the PDF API exists but isn't surfaced in the UI. |
| **Send invoice (email)** | — | No email/share functionality visible. |

### Sidebar has a simple link to `/invoices` but no sub-items. The "createInvoice" primary action is wired via `beforeLoad` on the list route, which renders a mobile-only button in the header.

---

## 3. PDF Generation Endpoint (`/api/documents/invoices/$id/pdf`)

**File:** `src/routes/api/documents/invoices/$id/pdf.ts`

**Flow:**
1. Extracts request headers, calls `resolveOrgForDocument(headers)` from `#/features/documents/server.tsx`
2. `resolveOrgForDocument` — imports `#/lib/auth`, calls `auth.api.getSession()`, then queries the `member` table to get the user's org ID
3. Calls `generateInvoicePdf(orgId, params.id)` which:
   - Queries `invoices` table (with orgId guard)
   - Queries `invoiceLineItems`, `paymentMethods`
   - Builds org info (logo signed URL, address, profile)
   - Builds customer info
   - Renders `<InvoiceDocument>` via `@react-pdf/renderer` → `renderToBuffer()`
   - Returns `Buffer`
4. Returns `application/pdf` with `Content-Disposition: inline`

**Auth errors handled:** 401 (Unauthorized), 403 (No organization), 404 (Invoice not found), 500 (server error)

**Assessment:** The PDF endpoint is **functionally complete** for authenticated users. It properly guards by org ID, handles errors with appropriate status codes, and returns an inline PDF.

---

## 4. Token Endpoint (`/api/documents/invoices/token/$token`)

**File:** `src/routes/api/documents/invoices/token/$token.ts`

**Flow:**
1. Looks up order by `orderToken` (no auth check — **public**)
2. Finds the invoice linked to that order (via `orderId` FK)
3. Calls `generateInvoicePdf(order.orgId, invoice.id)` — same PDF generation as above
4. Returns `application/pdf` with `Content-Disposition: inline`

**Assessment:** This is a **public sharing endpoint**. Anyone with the token can access the PDF. No session check, no org membership check. It uses the order's `orderToken` as an unguessable key. If `orderToken` is sufficiently random (UUID), this is safe for public sharing. Returns 404 if order or invoice not found.

---

## 5. Document Template (`InvoiceDocument`)

**File:** `src/features/documents/templates/invoice.tsx`

**Type:** `InvoicePdfData` from `src/features/documents/types.ts`

**What it renders (A4 PDF):**
- **Header:** Org logo (left) + "Invoice" title with invoice number, issued date, due date (right)
- **Addresses:** Two-column "Bill From" (org) and "Bill To" (customer)
- **Line items table:** Blue header row, columns: DESCRIPTION, RATE (IDR), QTY/HRS, TAX (%), AMOUNT (IDR)
- **Footer:** Left side — payment method details (bank name, account number) + notes; Right side — Subtotal, Taxes, Total (highlighted row)
- **Currency:** IDR (Indonesian Rupiah), formatted with `Intl.NumberFormat('id-ID')`
- **Font:** Helvetica (registered but no custom font files loaded — falls back to default Helvetica)

**Data shape:**
```ts
interface InvoicePdfData {
  org: OrgPdfInfo             // name, email, phone, address, logoUrl
  invoiceNumber: string
  issuedDate: string
  dueDate: string
  percentage: number | null
  customer: CustomerPdfInfo   // name, email, phone, address
  lineItems: PdfLineItem[]    // description, quantity, unitPrice, taxPercent, total
  subtotal: number
  taxes: number
  total: number
  notes: string | null
  paymentMethod: { name, bankName, accountNumber, accountHolder, instructions } | null
}
```

---

## 6. Sidebar/Navigation

**File:** `src/components/app-sidebar.tsx`

**Invoice nav item:**
```ts
{ key: 'invoices', href: '/invoices', icon: FileText }
```

**Visibility:** Invoice link is only shown for `owner` and `admin` roles (line 43-50):
```ts
if (['customers', 'products', 'invoices', 'settings', 'dashboard', 'orders'].includes(item.key)) {
  return role === 'owner' || role === 'admin'
}
```

**Role `member` cannot see the invoices link** in the sidebar.

---

## 7. Route Guards & Permission Checks

### `_org` layout guard (`src/routes/_org.tsx`, lines 14-26)
- **Session check:** Redirects to `/sign-in` if no session
- **Org check:** Redirects to `/onboarding` if no org membership
- Returns `{ session, org }` as route context (available to all child routes)

### Invoice-specific permissions

| Check | Location | Enforced How |
|-------|----------|--------------|
| Sidebar visibility | `app-sidebar.tsx:43-50` | `role === 'owner' || role === 'admin'` — `member` role cannot see nav link |
| API endpoint auth | `server.ts` `resolveOrgId()` | Queries `member` table for current user — no explicit role check, just membership |
| PDF endpoint auth | `features/documents/server.tsx` `resolveOrgForDocument()` | Same — session + membership, no role check |
| Token endpoint | `token/$token.ts` | **No auth** — public by design |
| Server fn org scoping | All server fns in `server.ts` | `resolveOrgId()` ensures user belongs to an org; invoice operations are scoped to that org |

**Gap:** There is **no explicit `canManageInvoices(role)` check** on any route or server function. The `canManageInvoices` helper exists in `src/features/permissions/model.ts` (returns `owner || admin`) but is not currently wired into the invoice server functions or route guards. The only enforcement is the sidebar visibility filter, which is client-side only.

### Org scoping
- All server functions call `resolveOrgId()` which queries `member.organizationId` for the current user
- `generateInvoicePdf` additionally verifies `eq(invoicesTable.orgId, orgId)` in the DB query
- This means even if a user guesses an invoice ID from another org, they cannot access it

---

## Summary of Gaps

1. **No edit invoice route** — invoices are created but never edited
2. **No PDF preview/download UI** — the API endpoints exist but aren't surfaced on the detail page
3. **No explicit permission enforcement** on server functions — only sidebar hides the link from `member` role; a user with `member` role could potentially call the server functions directly
4. **No print/share action** on the detail page
5. **Token endpoint is public** — ensure `orderToken` values are cryptographically random
