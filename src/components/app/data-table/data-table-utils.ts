import type { ColumnDef } from '@tanstack/react-table'

export type DataTableResult<TData> = {
  rows: TData[]
  totalRows: number
}

export type AppColumnMeta = {
  align?: 'start' | 'center' | 'end'
  cellClassName?: string
  headerClassName?: string
  label: string
  mobileRole?: 'title' | 'subtitle' | 'meta' | 'badge' | 'hidden' | 'actions'
  skeleton?: 'text' | 'badge' | 'avatar' | 'number' | 'actions'
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
}

export type DataTableSlotContext<TData> = {
  clearSelection: () => void
  selectedRowIds: string[]
  selectedRows: TData[]
  totalRows: number
  visibleRows: TData[]
}

export type SortState = {
  field: string
  direction: 'asc' | 'desc'
}

export const STORAGE_PREFIX = 'pabriq-datatable-columns'

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

export function encodeSort(field: string, direction: 'asc' | 'desc'): string {
  return `${field}:${direction}`
}

export function decodeSort(encoded: string): SortState | null {
  const idx = encoded.lastIndexOf(':')
  if (idx === -1) return null
  const field = encoded.slice(0, idx)
  const direction = encoded.slice(idx + 1)
  if (direction !== 'asc' && direction !== 'desc') return null
  return { field, direction }
}

export type AppColumnDef<TData> = ColumnDef<TData> & {
  meta?: AppColumnMeta
}
