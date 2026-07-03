import type { ColumnDef } from '@tanstack/react-table'
import {
  decodeSort,
  encodeSort,
  type SortDirection,
  type SortState,
} from '#/lib/sorting'

export type { SortDirection, SortState }
export { decodeSort, encodeSort }

export type AppColumnMeta = {
  align?: 'start' | 'center' | 'end'
  cellClassName?: string
  headerClassName?: string
  label: string
  mobileRole?: 'title' | 'subtitle' | 'meta' | 'badge' | 'hidden' | 'actions'
  skeleton?: 'text' | 'badge' | 'avatar' | 'number' | 'actions'
  sticky?: boolean
}

export type DataTableLabels = {
  clearFilters: string
  columnVisibility: string
  errorRetry: string
  errorTitle: string
  firstPage: string
  lastPage: string
  loading: string
  nextPage: string
  of: string
  page: string
  perPage: string
  previousPage: string
  resetColumns: string
  rowsSelected: (selected: number, total: number) => string
  visibleRows: (from: number, to: number, total: number) => string
  filters?: string
  applyFilters?: string
  cancelFilters?: string
  activeFilters?: string
}

export type DataTableSlotContext<TData> = {
  clearSelection: () => void
  selectedRowIds: string[]
  selectedRows: TData[]
  totalRows: number
  visibleRows: TData[]
}

const STORAGE_PREFIX = 'pabriq-datatable-columns'

export function getStoredVisibility(tableId: string): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}-${tableId}`)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export function setStoredVisibility(
  tableId: string,
  visibility: Record<string, boolean>,
) {
  try {
    localStorage.setItem(
      `${STORAGE_PREFIX}-${tableId}`,
      JSON.stringify(visibility),
    )
  } catch {
    /* noop */
  }
}

export function removeStoredVisibility(tableId: string) {
  try {
    localStorage.removeItem(`${STORAGE_PREFIX}-${tableId}`)
  } catch {
    /* noop */
  }
}

export type AppColumnDef<TData> = ColumnDef<TData> & {
  meta?: AppColumnMeta
}

export type FilterOption = { value: string; label: string }

export type DateRangeValue = { from: string | null; to: string | null }
export type FilterValue = string | null | string[] | DateRangeValue

export type FilterDefinitions = FilterDefinition[]
export type FilterDefinition =
  | ComboboxFilterDef
  | DateFilterDef
  | RadioChipsFilterDef
  | CustomFilterDef

type ComboboxFilterDef = {
  id: string
  label: string
  placeholder?: string
  type: 'combobox-single' | 'combobox-multi'
  options: FilterOption[]
}

type DateFilterDef = {
  id: string
  label: string
  placeholder?: string
  type: 'date-single' | 'date-range'
}

type RadioChipsFilterDef = {
  id: string
  label: string
  type: 'radio-chips'
  options: FilterOption[]
}

type DataTableFilterCustomContext = {
  value: FilterValue
  onChange: (value: FilterValue) => void
}

type CustomFilterDef = {
  id: string
  label: string
  type: 'custom'
  render: (ctx: DataTableFilterCustomContext) => React.ReactNode
}

export type DataTableFilterValues = Record<string, FilterValue>

export type DataTableFiltersConfig = {
  definitions: FilterDefinitions
  values: DataTableFilterValues
  onApply: (values: DataTableFilterValues) => void
  onClear: () => void
  customContent?: React.ReactNode
}

export type DataTableFilterLabels = {
  filters: string
  applyFilters: string
  cancelFilters: string
  activeFilters: string
}

export function isFilterActive(
  _def: FilterDefinition,
  value: FilterValue,
): boolean {
  if (value == null) return false
  if (typeof value === 'string' && value === '') return false
  if (Array.isArray(value) && value.length === 0) return false
  if (typeof value === 'object' && !Array.isArray(value)) {
    const r = value as DateRangeValue
    if (!r.from && !r.to) return false
  }
  return true
}

export function getActiveFilterCount(
  definitions: FilterDefinitions,
  values: DataTableFilterValues,
): number {
  return definitions.filter((def) => isFilterActive(def, values[def.id])).length
}

export function getVisibleColumns<TData>(
  allColumns: AppColumnDef<TData>[],
  columnVisibility: Record<string, boolean>,
): AppColumnDef<TData>[] {
  return allColumns.filter((col) => {
    if ('accessorKey' in col || 'id' in col) {
      const id = 'accessorKey' in col ? col.accessorKey : col.id
      if (id === 'select') return false
      return columnVisibility[id as string] !== false
    }
    return false
  })
}
