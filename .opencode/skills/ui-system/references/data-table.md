# DataTable System

> **Rules:** [`../rules/ui.md`](../rules/ui.md) — component conventions.

Location: `src/components/app/data-table/` — wraps `@tanstack/react-table` with desktop table + mobile card views, filtering, pagination, sorting, column visibility.

## Main Component

```tsx
import { DataTable } from '#/components/app/data-table'
import type { AppColumnDef } from '#/components/app/data-table'

const columns: AppColumnDef<Item>[] = [
  { accessorKey: 'name', header: 'Name', meta: { label: 'Name', mobileRole: 'title' } },
  { accessorKey: 'status', header: 'Status', meta: { label: 'Status', mobileRole: 'badge' },
    cell: ({ row }) => <StatusBadge status={row.original.status} /> },
]

<DataTable columns={columns} data={data} isLoading={isLoading} labels={dt} />
```

## Key Types

| Type | Description |
|---|---|
| `AppColumnDef<TData>` | ColumnDef with `meta?: AppColumnMeta` |
| `AppColumnMeta` | label, mobileRole (title/subtitle/meta/badge/hidden/actions), align, cellClassName, headerClassName, skeleton |
| `DataTableLabels` | All user-facing strings (for i18n) |
| `DataTableFiltersConfig` | Filter definitions, values, onApply/onClear |
| `DataTableSlotContext` | Selection state + visible rows |
| `DataTableResult<TData>` | `{ rows: TData[], totalRows: number }` |
| `SortState` | `{ field, direction }` |

## Filter Types (`FilterDefinition`)

| Type | Description |
|---|---|
| `combobox-single` | Single-select combobox |
| `combobox-multi` | Multi-select combobox |
| `date-single` | Single date picker |
| `date-range` | Date range picker |
| `radio-chips` | Radio chip row |
| `custom` | Custom render function |

## Sub-components

| Component | Description |
|---|---|
| `DataTableSearch` | Debounced search input |
| `DataTablePagination` | Page controls with per-page selector |
| `DataTableToolbar` | Toolbar with selection info + filter slot |
| `DataTableViewOptions` | Column visibility dropdown |
| `DataTableFilterPanel` | Modal/drawer-based filter panel |
| `DataTableFilterTrigger` | Filter button with active count badge |
| `DataTableFilterChips` | Radio chip filter row |
| `DataTableFilterCombobox` | Combobox filter (single/multi) |
| `DataTableFilterDate` | Date filter (single/range) |
| `DataTableActiveFilterChips` | Active filter badges |
| `DataTableMobileCard` | Mobile card rendering by mobileRole |
| `DataTableProvider` | Context provider for sub-components |

## Filter Configuration Example

```typescript
const filtersConfig: DataTableFiltersConfig = {
  definitions: [
    { id: 'status', label: 'Status', type: 'radio-chips', options: [...] },
    { id: 'date', label: 'Date', type: 'date-range' },
    { id: 'category', label: 'Category', type: 'combobox-multi', options: [...] },
  ],
  values: currentFilters,
  onApply: (values) => setFilters(values),
  onClear: () => clearFilters(),
}
```

## Helpers

- `encodeSort(field, direction)` / `decodeSort(encoded)` — sort param encoding
- `getStoredVisibility(tableId)` / `setStoredVisibility(tableId, visibility)` — localStorage column persistence (prefix: `pabriq-datatable-columns-`)
- `getActiveFilterCount(defs, values)` / `getFilterSummary(def, value, options)` — filter UI helpers

## State Handling

| State | UI Behavior |
|---|---|
| Loading | Skeleton rows |
| Empty | EmptyState component |
| No results (filtered) | SearchX icon |
| Error | AlertCircle with retry |
| Refetching | Overlay spinner |
