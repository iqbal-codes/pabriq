# Data Tables Reference

Scope: building or modifying list views that use `DataTable`, `useListPageState`, column definitions, filter definitions, and localized labels. This reference applies whenever a data table is created or columns/filters are added/changed.

## Prerequisites

- Feature query hook returning `{ data, isLoading, isRefetching, error, refetch }`.
- `use-intl` translations available for column headers, filter labels, and DataTable labels.
- `src/components/app/data-table/` barrel exports: `DataTable`, `DataTableSearch`, `useListPageState`, `createDataTableLabels`, `AppColumnDef`, `DataTableFiltersConfig`, `DataTableLabels`.

## Ordered recipe

### 1. Wire URL state with `useListPageState`

Source: `src/components/app/data-table/use-list-page-state.ts`.

Returns: `search` (string), `page` (number), `perPage` (number, default 25), `sort` (SortState | null), and setters that auto-reset page to 1 on sort/perPage change.

### 2. Define columns with `AppColumnDef<T>`

Every column needs `accessorKey`, `header`, and `meta` with `label` + `mobileRole`. Follow the canonical patterns in `src/features/customers/pages/customers-list-page.tsx` (lines 126–183) and `src/features/orders/components/order-table-columns.tsx`.

**(Observed)** `mobileRole` values: `'title'`, `'description'`, `'badge'`, `'meta'`. These map fields to the mobile card layout. Source: `src/components/app/data-table/data-table-mobile-card.tsx`.

**(Observed)** `AppColumnMeta` type: `{ label: string; mobileRole: 'title' | 'description' | 'badge' | 'meta' }`. Source: `src/components/app/data-table/data-table-utils.ts:12-20`.

### 3. Define filters with `DataTableFiltersConfig`

Source: `src/components/app/data-table/data-table-utils.ts:137-143`.

```ts
type DataTableFiltersConfig = {
  definitions: FilterDefinitions
  values: DataTableFilterValues
  onApply: (values: DataTableFilterValues) => void
  onClear: () => void
  customContent?: React.ReactNode
}
```

Filter definition types:
- `'radio-chips'` — chip-toggle single select. Options: `FilterOption[]`.
- `'combobox-single'` — single-select combobox. Options: `FilterOption[]`.
- `'combobox-multi'` — multi-select combobox. Options: `FilterOption[]`.
- `'date-single'` — single date picker.
- `'date-range'` — date range picker.
- `'custom'` — render function receiving `{ value, onChange }`.

Canonical pattern: `src/features/customers/pages/customers-list-page.tsx:106-124` (inline `useMemo`), `src/features/orders/components/order-table-columns.tsx:215-229` (factory function).

**(Observed)** Filter states are draft/committed: changes apply on confirm, not on selection. Desktop uses inline `DataTableInlineFilters` or `DataTableFilterPanel` (Dialog). Mobile uses Drawer. Source: `src/components/app/data-table/data-table-filter-panel.tsx`.

### 4. Create localized labels

Factory returns all required `DataTableLabels` keys. Source: `src/components/app/data-table/create-data-table-labels.ts`.

```ts
const labels = createDataTableLabels(t)
```

### 5. Compose the DataTable

Follow the canonical pattern in `src/features/customers/pages/customers-list-page.tsx:185-228`. Key props: `columns`, `data`, `isLoading`, `isRefetching`, `error`, `labels`, `page`, `perPage`, `sort`, `totalRows`, `tableId`, `filters`, `toolbarStart`.

**(Observed)** `DataTableSearch` uses `value` + `onChange` (not `onValueChange`). Canonical: `<DataTableSearch placeholder={t('searchPlaceholder')} value={search} onChange={(v) => setSearch(v || null)} />`. Source: `src/components/app/data-table/data-table-search.tsx`.

**(Observed)** `tableId` is required — used as localStorage key for column visibility persistence. Source: `src/components/app/data-table/data-table-utils.ts:52`.

## Invariants

**(Required)**
- Every `AppColumnDef` must include `meta.label` for mobile card rendering.
- `tableId` must be unique per table instance — collisions corrupt column visibility state.
- `createDataTableLabels` must be called with the translation function, not raw strings.
- All user-facing filter labels and column headers must go through `useTranslations`.

**(Observed)**
- Column visibility is localStorage-backed with key `pabriq-datatable-columns-<tableId>`. Source: `src/components/app/data-table/data-table-utils.ts:52`.
- Desktop sorts via clickable column headers; mobile sorts are not available. Source: `src/components/app/data-table/data-table-desktop-view.tsx`.
- Mobile uses `IntersectionObserver` with 400px root margin for infinite scroll accumulation. Source: `src/components/app/data-table/use-data-table-accumulation.ts`.
- Search debounce: 300ms, flushes on Enter/onBlur. Source: `src/components/app/data-table/data-table-search.tsx`.

## Variations

**(Observed)**
- **Row actions**: pass `rowActions` prop — renders `DropdownMenu` per row in a sticky actions column. Canonical: `src/features/production/components/stage-columns.tsx`.
- **Row selection**: set `enableRowSelection={true}` — adds checkbox column + selection toolbar. Canonical: `src/features/customers/pages/customers-list-page.tsx`.
- **Custom mobile card**: pass `customMobileCard` to override the default card layout. Source: `data-table.tsx:116`.
- **Toolbar slots**: `toolbarStart` (left) and `toolbarEnd` (right) for search, filters, and custom actions. Source: `data-table.tsx:113-114`.
- **No results state**: separate from empty — `noResultsState`/`noResultsTitle` for when filters return zero results. Source: `data-table.tsx:103-108`.

## Failure states

**(Observed)**
- Error state renders `DataTableErrorRender` with retry button calling `onRefetch`. Source: `src/components/app/data-table/data-table-state-render.tsx`.
- Empty state renders `DataTableEmptyRender` with optional action. Source: same.
- No-results state renders `DataTableNoResultsRender` with clear-filters action. Source: same.
- Skeleton states: `DataTableDesktopSkeleton` (table rows) and `DataTableMobileSkeleton` (card stacks). Source: `src/components/app/data-table/data-table-skeleton.tsx`.

## Canonical pointers

| What | Path |
|------|------|
| DataTable orchestrator | `src/components/app/data-table/data-table.tsx` |
| URL state hook | `src/components/app/data-table/use-list-page-state.ts` |
| Labels factory | `src/components/app/data-table/create-data-table-labels.ts` |
| Types + filter defs | `src/components/app/data-table/data-table-utils.ts` |
| Column visibility | `src/components/app/data-table/use-data-table-column-visibility.ts` |
| Mobile accumulation | `src/components/app/data-table/use-data-table-accumulation.ts` |
| Filter panel | `src/components/app/data-table/data-table-filter-panel.tsx` |
| Inline filters | `src/components/app/data-table/data-table-inline-filters.tsx` |
| Search | `src/components/app/data-table/data-table-search.tsx` |
| Skeletons | `src/components/app/data-table/data-table-skeleton.tsx` |
| State renders | `src/components/app/data-table/data-table-state-render.tsx` |
| Barrel exports | `src/components/app/data-table/index.ts` |
| Customer list (canonical) | `src/features/customers/pages/customers-list-page.tsx` |
| Order list (canonical) | `src/features/orders/pages/orders-list-page.tsx` |
| Stage columns (canonical) | `src/features/production/components/stage-columns.tsx` |

## Verification

```bash
bun run test -- src/components/app/data-table/data-table.test.tsx
```

Covers: rendering, states (loading/error/empty), pagination, sorting, column visibility, filter activation, search debounce, mobile view toggle.

## Completion criterion

DataTable renders with columns using `mobileRole`, filters using `DataTableFiltersConfig` (with `values`, `onApply`, `onClear`), labels from `createDataTableLabels`, URL state via `useListPageState`, all four data states handled, and `bun run test -- src/components/app/data-table/data-table.test.tsx` passes.
