# App Components — Badge & StatusBadge Reference Report

## Summary

Two badge layers exist in the project:

1. **`<Badge>` (UI primitive)** — `src/components/ui/badge.tsx` — base component with variants: `default`, `secondary`, `destructive`, `outline`, `success`, `warning`, `ghost`, `link`.
2. **`<StatusBadge>` (domain abstraction)** — `src/components/status-badge.tsx` — wraps `<Badge>` with a status→variant mapping and i18n label lookup.

---

## Files That Reference Badge or StatusBadge

### 1. `src/components/status-badge.tsx` (core StatusBadge component)

- **Lines:** 1–57
- **What it does:** Exports `StatusBadge({ status: string })`. Maps known status strings to Badge variants via a `statusMap` Record, then renders `<Badge variant={...}>` with a translated label via `useTranslations('status')`.
- **Supported statuses:** `draft`, `pending`, `approved`, `production`, `in_delivery`, `completed`, `cancelled`, `active`, `inactive`, `paid`, `partially_paid`, `unpaid`, `void`, `pendingPayment`, `overdue`, `failed`.
- **Fallback:** Unknown status → `variant="outline"`, label = raw status string.

### 2. `src/components/status-badge.test.tsx`

- **Lines:** 1–67
- **What it does:** Tests StatusBadge rendering for known statuses (translated label), unknown status (fallback raw string), and Pabriq order lifecycle coverage.

### 3. `src/components/ui/badge.tsx` (Badge UI primitive)

- **Lines:** 1–69
- **What it does:** Renders `<span data-slot="badge">` using CVA variants. Supports `asChild` via Radix Slot.
- **Variants defined:** `default`, `secondary`, `destructive`, `success`, `warning`, `outline`, `ghost`, `link`.
- **Override for unknown statuses:** `StatusBadge` passes `variant="outline"` as fallback, which is valid in `badgeVariants`.

### 4. `src/components/app/asset-file.tsx`

- **Lines:** 12, 135–137, 225–230
- **What it does:** Imports `<Badge>` directly. Uses `Badge variant="outline"` and `Badge variant="secondary"` to display file extension badges (e.g., `.pdf`, `.jpg`) on asset thumbnails and preview tiles.

### 5. `src/components/app/data-table/data-table-filter-combobox.tsx`

- **Lines:** 3, 150–161, 167
- **What it does:** Imports `<Badge>`. Uses `Badge variant="secondary"` to show selected filter options as removable chips, and a count badge when >3 values are selected (`+N`).

### 6. `src/components/app/data-table/data-table-filter-trigger.tsx`

- **Lines:** 2, 28–33, 71–82
- **What it does:** Imports `<Badge>`. Uses `Badge variant="secondary"` in two contexts: (a) active filter count badge on the Filters button, (b) per-filter value chips showing `Label: value` with a remove button.

### 7. `src/components/app/data-table/data-table-mobile-card.tsx`

- **Lines:** 25–28, 55–57
- **What it does:** **Does not import Badge directly.** Uses the `mobileRole: 'badge'` column metadata to identify which column should render as a "badge" cell in mobile card layout. The actual cell rendering uses `flexRender`, so the column's cell definition is responsible for rendering a `<Badge>` or `<StatusBadge>`.

### 8. `src/components/app/data-table/data-table-utils.ts`

- **Lines:** 13–14
- **What it does:** Defines `AppColumnMeta.mobileRole` type with `'badge'` as a valid value. Also defines `skeleton` type with `'badge'` as a valid skeleton shape.

### 9. `src/components/app/data-table/data-table.test.tsx`

- **Lines:** 26, 35–37, 61–63, 92, 214–216, 238, 255–259, 266, 294–303, 361–370, 383–394, 402–411, 445–458, 543–544, 587–588
- **What it does:** Test data includes a `status` string field, a column with `accessorKey: 'status'` and `meta: { mobileRole: 'badge' }`. Tests reference "status" extensively as filter key and data field. No direct Badge component import.

### 10. `src/components/app/form/combobox-field.tsx`

- **Lines:** 7, 338–349, 352
- **What it does:** Imports `<Badge>`. Uses `Badge variant="secondary"` for displaying selected multi-select values as removable chips, and a `+N` overflow badge.

### 11. `src/components/app/form/form.test.tsx`

- **Lines:** 52, 56, 59, 72
- **What it does:** Test uses `'status'` as a field name in a SelectField test. No Badge import, just a form field named "status".

### 12. `src/components/app/asset-upload/` files

These files reference upload item `status` (pending/uploading/processing/done/failed) for conditional rendering of progress, icons, retry buttons, and status text **but do not use `<Badge>` or `<StatusBadge>`**. They use native `<span>` elements with `text-muted-foreground`, `text-success`, `text-destructive` classes instead.

- **`asset-upload/file-list-upload.tsx`** (lines 51–82): `item.status === 'uploading' | 'processing' | 'done' | 'failed'`
- **`asset-upload/asset-upload-dropzone.tsx`** (lines 19–68): DropzoneIcon component + status-based conditional rendering
- **`asset-upload/photo-grid-upload.tsx`** (lines 58–74): Status-based overlay rendering
- **`asset-upload/use-upload-machine.ts`** (lines 66–159): State machine uses `status` field to track upload item lifecycle
- **`asset-upload/use-upload-machine.test.tsx`** (line 64): Asserts `item.status === 'done'`
- **`asset-upload/r2-adapter.ts`** / **`r2-portal-adapter.ts`**: Check `xhr.status` (HTTP status code), unrelated to UI badges

### 13. `src/features/invoices/pages/invoice-detail-page.tsx`

- **Lines:** 14, 25, 316, 318, 436–442
- **What it does:** Only consumer of `<StatusBadge>` outside of `src/components/` (imported from `#/components/status-badge`). Uses it to show invoice status. Also uses `<Badge variant="secondary">` for invoice percentage display and dynamic `Badge variant={pm.status === 'rejected' ? 'destructive' : 'secondary'}` for payment method status.

---

## Key Observations

| Concern | Details |
|---|---|
| **No StatusBadge in `src/components/app/`** | `StatusBadge` lives at `src/components/status-badge.tsx`. The only consumer is `invoice-detail-page.tsx`. No data-table or form in `app/` uses `StatusBadge` currently. |
| **Badge usage in `src/components/app/`** | Limited to data-table filter chips (`variant="secondary"`), combobox selected-value chips (`variant="secondary"`), and asset file extension labels (`variant="outline"` / `variant="secondary"`). |
| **Status-vs-Badge gap** | The data-table columns in `data-table.test.tsx` define a `status` column with `mobileRole: 'badge'`, but there's no integrated `StatusBadge` column cell renderer in the data-table utilities. Columns would need to provide their own cell rendering (e.g., `<StatusBadge status={...} />`). |
| **Upload components** use status for logic (pending/uploading/processing/done/failed) but render via plain `<span>` elements, not `<Badge>`. |
| **`Badge` variants are extended** beyond shadcn defaults: `success`, `warning`, `ghost`, and `link` are added. `StatusBadge.statusMap` relies on `success`, `warning`, `outline`, `secondary`, `default`, and `destructive`. All are defined in `badgeVariants`. |

## Architecture Diagram

```
<Badge> (ui/badge.tsx)
  ├── variant: default | secondary | destructive | outline | success | warning | ghost | link
  │
  ├── used directly in:
  │   ├── asset-file.tsx (ext badges)
  │   ├── data-table-filter-combobox.tsx (filter chips)
  │   ├── data-table-filter-trigger.tsx (filter count + chips)
  │   ├── combobox-field.tsx (selected value chips)
  │   └── invoice-detail-page.tsx (percentage, pm status)
  │
  └── consumed by:
      └── <StatusBadge> (status-badge.tsx)
          └── maps status → variant, i18n label
              └── used in: invoice-detail-page.tsx
```

## Start Here

If you need to integrate status badges into data-table columns or create a reusable status column helper, open **`src/components/status-badge.tsx`** to understand the existing mapping, then **`src/components/app/data-table/data-table-utils.ts`** to understand `AppColumnMeta` and how `mobileRole: 'badge'` is expected to work.
