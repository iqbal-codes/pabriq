# Status & Badge Rendering di `src/features/`

## Ringkasan

Ada dua pendekatan rendering status badge:

1. **`StatusBadge` component** (shared) — digunakan di `invoice-detail-page.tsx`. Memiliki mapping status→variant dan menggunakan `useTranslations('status')`.
2. **`<Badge>` langsung** — digunakan di semua halaman lain, dengan variant dan label diteruskan manual. Sumber status meliputi:
   - `useTranslations('status')` (`st()`) — untuk status pesanan/invoice
   - `useTranslations('common')` (`ct()`) — untuk status aktif/non-aktif
   - `useTranslations('production')` — untuk status task produksi
   - Hardcoded label inline

---

## 1. Shared Component: `StatusBadge`

**File:** `src/components/status-badge.tsx` (seluruh file)

```tsx
// Mapping status → variant Badge
const statusMap: Record<string, StatusVariant> = {
  draft: 'secondary',
  pending: 'outline',
  approved: 'default',
  production: 'warning',
  in_delivery: 'default',
  completed: 'success',
  cancelled: 'destructive',
  active: 'success',
  inactive: 'secondary',
  paid: 'success',
  partially_paid: 'warning',
  unpaid: 'outline',
  void: 'destructive',
  pendingPayment: 'warning',
  overdue: 'destructive',
  failed: 'destructive',
}

export function StatusBadge({ status }: { status: string }) {
  const t = useTranslations('status')
  const variant = statusMap[status] ?? 'outline'
  const label = status in statusMap
    ? t(status as ...)
    : status
  return <Badge variant={variant as never}>{label}</Badge>
}
```

**Penggunaan di features:**
- `src/features/invoices/pages/invoice-detail-page.tsx` (line 14 import, line ~300 dipakai)
  ```tsx
  <StatusBadge status={invoice.status} />
  {invoice.percentage && <Badge variant="secondary">{invoice.percentage}%</Badge>}
  ```

**Test:** `src/components/status-badge.test.tsx` — mencakup status lifecycle order dan fallback unknown.

---

## 2. Invoice: list table

**File:** `src/features/invoices/pages/invoice-list-page.tsx` (lines 87–113)

```tsx
{
  accessorKey: 'status',
  header: t('status'),
  meta: { label: t('status'), mobileRole: 'badge' },
  cell: ({ row }: { row: { original: InvoiceRow } }) => (
    <Badge>
      {st(row.original.status as
        | 'draft' | 'pending' | 'approved' | 'production'
        | 'in_delivery' | 'completed' | 'cancelled' | 'rejected'
        | 'active' | 'inactive' | 'paid' | 'partially_paid'
        | 'unpaid' | 'void' | 'overdue' | 'pendingPayment' | 'failed')}
    </Badge>
  ),
},
```

- `Badge` tanpa `variant` → default variant (`primary`).
- Label dari `useTranslations('status')`.

---

## 3. Invoice: detail payments

**File:** `src/features/invoices/pages/invoice-detail-page.tsx` (line ~380)

```tsx
<Badge variant={pm.status === 'rejected' ? 'destructive' : 'secondary'}>
  {pm.status}
</Badge>
```

- Payment status badge: `destructive` jika rejected, `secondary` jika lainnya.
- Label langsung `pm.status` (tidak via i18n).

---

## 4. Payment Methods

**File:** `src/features/invoices/pages/payment-methods-page.tsx` (lines 165–174)

```tsx
{
  id: 'active',
  header: ct('status'),
  meta: { label: ct('status'), mobileRole: 'badge' },
  cell: ({ row }) => (
    <Badge variant={row.original.active ? 'default' : 'secondary'}>
      {row.original.active ? t('active') : t('inactive')}
    </Badge>
  ),
}
```

- Active/inactive badge: `default` jika aktif, `secondary` jika tidak.

---

## 5. Create Invoice (Order status card)

**File:** `src/features/invoices/pages/create-invoice-page.tsx` (line ~138)

```tsx
<Badge variant="secondary">{orderData.order.status}</Badge>
```

- Status order mentah (tanpa i18n), variant `secondary`.

---

## 6. Orders: list table

**File:** `src/features/orders/pages/orders-list-page.tsx` (lines 165–174)

```tsx
{
  accessorKey: 'status',
  header: t('status'),
  meta: { label: t('status'), mobileRole: 'badge' },
  cell: ({ row }) => (
    <Badge variant="secondary">
      {st(row.original.status as
        | 'draft' | 'pending' | 'approved' | 'in_progress'
        | 'production' | 'in_delivery' | 'completed'
        | 'cancelled' | 'rejected')}
    </Badge>
  ),
},
```

- `variant="secondary"`, label dari `useTranslations('status')`.

---

## 7. Orders: detail page header

**File:** `src/features/orders/pages/view-order-page.tsx` (lines ~260–270)

```tsx
<Badge variant="secondary">
  {st(order.status as
    | 'draft' | 'pending' | 'approved' | 'in_progress'
    | 'production' | 'in_delivery' | 'completed'
    | 'cancelled' | 'rejected')}
</Badge>
```

- Sama dengan list: `variant="secondary"`, label dari status translation.

---

## 8. Products: list table (active badge)

**File:** `src/features/products/pages/products-list-page.tsx` (lines 170–179)

```tsx
{
  accessorKey: 'active',
  header: t('active'),
  meta: { label: st('active'), mobileRole: 'badge' },
  cell: ({ row }) => (
    <Badge variant={row.original.active ? 'default' : 'secondary'}>
      {row.original.active ? st('active') : st('inactive')}
    </Badge>
  ),
},
```

- Active/inactive badge untuk produk.

---

## 9. Products: detail page header

**File:** `src/features/products/pages/view-product-page.tsx` (lines ~44–49)

```tsx
<Badge variant={product.active ? 'default' : 'secondary'} className="mt-1">
  {product.active ? st('active') : st('inactive')}
</Badge>
```

---

## 10. Customers: list table (active badge)

**File:** `src/features/customers/pages/customers-list-page.tsx` (lines 154–163)

```tsx
{
  accessorKey: 'active',
  header: t('active'),
  meta: { label: st('active'), mobileRole: 'badge' },
  cell: ({ row }) => (
    <Badge variant={row.original.active ? 'default' : 'secondary'}>
      {row.original.active ? st('active') : st('inactive')}
    </Badge>
  ),
},
```

---

## 11. Customers: detail page header

**File:** `src/features/customers/pages/view-customer-page.tsx` (lines ~41–46)

```tsx
<Badge variant={customer.active ? 'default' : 'secondary'} className="mt-1">
  {customer.active ? st('active') : st('inactive')}
</Badge>
```

---

## 12. Production: Kanban Task Card

**File:** `src/features/production/components/kanban-task-card.tsx` (seluruh file, 83 lines)

```tsx
const STATUS_LABELS: Record<string, 'statusQueued' | 'statusInProgress' | 'pendingApproval' | 'statusCompleted'> = {
  queued: 'statusQueued',
  in_progress: 'statusInProgress',
  pending_approval: 'pendingApproval',
  completed: 'statusCompleted',
}

// Dalam render:
<Badge
  variant={isPendingApproval ? 'outline' : 'secondary'}
  className={`text-xs leading-3 ${isPendingApproval ? 'border-warning text-warning' : ''}`}
>
  {isPendingApproval && <Lock className="size-3 mr-0.5" />}
  {t(STATUS_LABELS[taskData.status] ?? taskData.status as ...)}
</Badge>
```

- **Pending approval** mendapat `variant="outline"` + warna `warning` + icon `Lock`.
- Status lainnya `variant="secondary"`.
- Label dari `useTranslations('production')`.

---

## 13. Production: Task Detail Modal

**File:** `src/features/production/components/task-detail-modal.tsx` (lines 35–42, 130, 164–165)

```tsx
const STATUS_LABELS = {
  queued: 'statusQueued',
  in_progress: 'statusInProgress',
  pending_approval: 'pendingApproval',
  completed: 'statusCompleted',
} as const

// Dalam render:
<Badge variant="secondary">
  {statusLabelKey ? t(statusLabelKey) : task.status}
</Badge>
```

- `variant="secondary"`, label dari production translation.

---

## 14. Production: Kanban Column count badge

**File:** `src/features/production/components/kanban-column.tsx` (line ~18)

```tsx
<Badge variant="default" className="text-xs size-5">
  {count}
</Badge>
```

- Bukan status, melainkan jumlah task per kolom.

---

## 15. Members: role badge

**File:** `src/features/members/pages/members-page.tsx` (lines ~170–180, ~205)

```tsx
// Member role:
<Badge variant={isOwner ? 'default' : 'secondary'}>
  {t(roleLabelKey)}
</Badge>

// Invitation role:
<Badge variant="secondary">
  {t(ROLE_LABEL_KEYS[row.original.role] ?? row.original.role)}
</Badge>
```

- Owner: `variant="default"`, lainnya: `variant="secondary"`.
- Bukan "status" bisnis, melainkan role membership.

---

## 16. Portal: Progress View

**File:** `src/features/portal/pages/progress-view.tsx` (lines 89–94, 149–153)

```tsx
const statusLabel: Record<string, string> = {
  approved: t('statusApproved'),
  production: t('statusProduction'),
  in_delivery: t('statusInDelivery'),
  completed: t('statusCompleted'),
  cancelled: t('statusCancelled'),
}

// Dalam render:
{order.status && (
  <Badge variant="secondary" className="shrink-0 mt-1.5">
    {statusLabel[order.status] ?? order.status}
  </Badge>
)}
```

- Mapping hardcoded lokal, `variant="secondary"`.

---

## 17. Portal: Payment Section

**File:** `src/features/portal/components/payment-section.tsx` (lines ~56–75)

```tsx
{isOverdue && <Badge variant="destructive">{t('overdue')}</Badge>}
{isPending ? (
  <Badge variant="secondary">
    <Clock className="mr-1 size-3" />
    {t('pendingConfirmation')}
  </Badge>
) : (
  <Badge variant={isUnpaid ? 'default' : 'secondary'}>
    {st(inv.status as ...)}
  </Badge>
)}
```

- Overdue: `variant="destructive"` dengan label `t('overdue')`.
- Pending confirmation: `variant="secondary"` dengan icon `Clock`.
- Unpaid: `variant="default"`.
- Lainnya (paid/partially_paid/dll): `variant="secondary"`.
- File ini juga menggunakan `isOverdue` logic komputasi lokal.

---

## 18. Portal: Portal Page (routing by status)

**File:** `src/features/portal/pages/portal-page.tsx` (lines 28–31)

```tsx
if (order.status === 'pending') return <PendingView order={order} />
if (order.status === 'draft') return <DraftView order={order} token={token} />
if (order.status === 'rejected') return <RejectedView order={order} />
return <ProgressView order={order} token={token} />
```

- Bukan badge, melainkan conditional rendering komponen berdasarkan status.

---

## 19. Assets / Upload Machine

**File:** `src/features/assets/upload-machine.ts`

```ts
export type UploadStatus = 'pending' | 'uploading' | 'processing' | 'done' | 'failed'
```

- Tipe status upload asset, tidak dirender sebagai badge secara langsung di scope features.

**File:** `src/features/assets/model.ts`

```ts
export type AssetStatus = 'pending' | 'active' | 'deleted'
```

- Status asset database, tidak ada rendering badge di features.

---

## 20. Admin mock data

**File:** `src/features/admin/model.ts`

```ts
export type AdminUser = {
  status: 'Active' | 'Invited' | 'Suspended'
}
export type AdminAction = {
  status: 'Ready' | 'Review' | 'Blocked'
}
```

- Hanya tipe data statis, belum ada rendering badge.

---

## Ringkasan Pola

| Pola | Variant | Sumber Label | Digunakan di |
|------|---------|-------------|--------------|
| `StatusBadge` component | Map `statusMap` → `default/secondary/destructive/outline/success/warning` | `useTranslations('status')` | `invoice-detail-page.tsx` |
| Order/invoice status (list & detail) | `secondary` | `useTranslations('status')` | `orders-list`, `view-order`, `invoice-list` |
| Active/inactive (product, customer, payment method) | `default` / `secondary` | `useTranslations('status')` | semua list & detail produk/customer |
| Production task status | `secondary` (normal), `outline` + `warning` (pending_approval) | `useTranslations('production')` | `kanban-task-card`, `task-detail-modal` |
| Payment invoice status (portal) | `destructive` (overdue), `default` (unpaid), `secondary` (others) | `useTranslations('invoices/status')` | `portal/payment-section` |
| Member role | `default` (owner), `secondary` (others) | `useTranslations('members')` | `members-page` |
| Payment method active | `default` / `secondary` | `useTranslations('invoices')` | `payment-methods-page` |
| Order status (portal) | `secondary` | Map hardcoded lokal | `portal/progress-view` |

## File Lengkap (46 file mengandung 'status')

**Yang memiliki rendering badge visual (24 file):**

1. `src/components/status-badge.tsx` — Shared StatusBadge component
2. `src/components/status-badge.test.tsx` — Test StatusBadge
3. `src/features/invoices/pages/invoice-detail-page.tsx` — StatusBadge + payment status
4. `src/features/invoices/pages/invoice-list-page.tsx` — status column badge
5. `src/features/invoices/pages/payment-methods-page.tsx` — active/inactive badge
6. `src/features/invoices/pages/create-invoice-page.tsx` — order status badge
7. `src/features/orders/pages/orders-list-page.tsx` — status column badge
8. `src/features/orders/pages/view-order-page.tsx` — status header badge
9. `src/features/products/pages/products-list-page.tsx` — active/inactive badge
10. `src/features/products/pages/view-product-page.tsx` — active/inactive badge
11. `src/features/customers/pages/customers-list-page.tsx` — active/inactive badge
12. `src/features/customers/pages/view-customer-page.tsx` — active/inactive badge
13. `src/features/production/components/kanban-task-card.tsx` — task status badge
14. `src/features/production/components/task-detail-modal.tsx` — task status badge
15. `src/features/production/components/kanban-column.tsx` — count badge
16. `src/features/members/pages/members-page.tsx` — role badge
17. `src/features/portal/pages/progress-view.tsx` — order status badge
18. `src/features/portal/pages/portal-page.tsx` — routing by status
19. `src/features/portal/components/payment-section.tsx` — invoice status badges
20. `src/features/portal/components/payment-alert-banner.tsx` — alert variant by status
21. `src/features/portal/components/line-item-task-card.tsx` — (imports Badge)

**Model/data definitions (11 file):**

22. `src/features/invoices/model.ts` — Invoice type with status field
23. `src/features/orders/model.ts` — Order type with status field
24. `src/features/production/model.ts` — ProductionTask with status field
25. `src/features/assets/model.ts` — AssetStatus type
26. `src/features/assets/upload-machine.ts` — UploadStatus type
27. `src/features/admin/model.ts` — AdminUser/AdminAction status types
28. `src/features/products/model.ts` — product status references
29. `src/features/products/model.test.ts` — test references
30. `src/features/customers/model.ts` — customer status references
31. `src/features/portal/model.ts` — portal model status
32. `src/features/portal/model.test.ts` — test references

**Server/data logic (7 file):**

33. `src/features/orders/server.ts` — server fn status references
34. `src/features/invoices/server.ts` — server fn status references
35. `src/features/products/server.ts` — server fn status references
36. `src/features/assets/server.ts` — server fn status references
37. `src/features/members/server.ts` — server fn invitation status
38. `src/features/production/spawner.ts` — task creation with 'queued' status
39. `src/features/documents/server.tsx` — status 200/401/403 references

**Test files (4 file):**

40. `src/features/invoices/model.test.ts`
41. `src/features/address/model.test.ts`
42. `src/features/production/components/kanban-board.test.tsx`
43. `src/features/production/components/kanban-task-card.test.tsx`
44. `src/features/production/components/kanban-column.test.tsx`
45. `src/features/production/components/task-detail-modal.test.tsx`
46. `src/features/products/pages/view-product-page.test.tsx`
