# Route Files: Status & Badge Usage Report

> Generated: 2026-05-18
> Scope: `src/routes/` — all files containing "status" or using `Badge`/`StatusBadge`.

---

## 1. Files Containing "status" in `src/routes/`

### 1.1 `src/routes/_org/customers/index.tsx` (lines 9, 18)
- **Type:** Route file for `/customers/`
- **Status:** Used as an optional search/filter parameter in `CustomerSearch` type and `validateSearch`.
- **Badge usage:** None directly. The feature page (`CustomersListPage`) may render status badges via its own components.
```ts
type CustomerSearch = {
  q?: string
  page?: number
  perPage?: number
  sort?: string
  status?: string           // ← filter param
}
```

### 1.2 `src/routes/_org/products/index.tsx` (lines 9, 18)
- **Type:** Route file for `/products/`
- **Status:** Same pattern — optional search/filter parameter.
- **Badge usage:** None directly.
```ts
type ProductSearch = {
  q?: string
  page?: number
  perPage?: number
  sort?: string
  status?: string           // ← filter param
}
```

### 1.3 `src/routes/_org/customers/-list.test.tsx` (lines 27-28)
- **Type:** Test file for customers data table
- **Status:** Column header labeled "Status" with `mobileRole: 'badge'` for mobile responsive rendering.
```ts
{
  accessorKey: 'active',
  header: 'Status',
  meta: { label: 'Status', mobileRole: 'badge' },
}
```

---

## 2. Files Using Badge Component in `src/routes/`

### 2.1 `src/routes/_org/production/index.tsx` (lines 4, 44-46, 52-54)
- **Type:** Route file for `/production/`
- **Imports:** `Badge` from `#/components/ui/badge`
- **Usage:** Count badges next to tab labels (active/archive counts). Uses `variant="default"`.
```tsx
import { Badge } from '#/components/ui/badge'

// Inside TabsTrigger:
<Badge variant="default" className="ml-1.5 text-xs size-5">
  {counts.active}
</Badge>
<Badge variant="default" className="ml-1.5 text-xs size-5">
  {counts.archived}
</Badge>
```

---

## 3. StatusBadge Component — Not Directly Used in Routes

The `StatusBadge` component (`src/components/status-badge.tsx`) is **not imported directly in any route file.** It is used in feature pages that are **rendered by** route files:

| Route File | Renders Feature Page | Feature Page Uses StatusBadge? |
|---|---|---|
| `_org/invoices/$id/index.tsx` | `InvoiceDetailPage` | ✅ Yes (`features/invoices/pages/invoice-detail-page.tsx`, line 316) |
| `_org/customers/index.tsx` | `CustomersListPage` | Possibly (check features layer) |
| `_org/products/index.tsx` | `ProductsListPage` | Possibly (check features layer) |

### 3.1 StatusBadge Definition (`src/components/status-badge.tsx`)

Maps status strings to Badge variants:

| Status Value | Badge Variant |
|---|---|
| `draft` | `secondary` |
| `pending` | `outline` |
| `approved` | `default` |
| `production` | `warning` |
| `in_delivery` | `default` |
| `completed` | `success` |
| `cancelled` | `destructive` |
| `active` | `success` |
| `inactive` | `secondary` |
| `paid` | `success` |
| `partially_paid` | `warning` |
| `unpaid` | `outline` |
| `void` | `destructive` |
| `pendingPayment` | `warning` |
| `overdue` | `destructive` |
| `failed` | `destructive` |
| *(unknown)* | `outline` |

### 3.2 Badge Component Variants (`src/components/ui/badge.tsx`)

Available variants on the `Badge` component: `default`, `secondary`, `destructive`, `success`, `warning`, `outline`, `ghost`, `link`.

---

## 4. Summary Table

| File | Contains "status" | Uses `<Badge>` | Uses `<StatusBadge>` | Notes |
|---|---|---|---|---|
| `_org/customers/index.tsx` | ✅ (search param) | ❌ | ❌ | Filters feature delegates to feature page |
| `_org/products/index.tsx` | ✅ (search param) | ❌ | ❌ | Same pattern |
| `_org/customers/-list.test.tsx` | ✅ (column label) | ❌ | ❌ | Test only, `mobileRole: 'badge'` |
| `_org/production/index.tsx` | ❌ | ✅ (count badges) | ❌ | Tab count badges, `variant="default"` |
| `_org/invoices/$id/index.tsx` | ❌ | ❌ | ❌ (renders InvoiceDetailPage which **does** use StatusBadge) | Indirect usage |
| All other route files | ❌ | ❌ | ❌ | No status/badge content |

---

## 5. Key Insight

`StatusBadge` is a **feature-level component** (`components/status-badge.tsx`), not a **route-level component**. Route files delegate rendering to feature pages. The route files themselves only pass `status` as a search/filter parameter to the feature layer. To find actual `StatusBadge` usage, look in the **features layer** (`src/features/`), not in routes.
