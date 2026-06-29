import type { DataTableLabels } from './data-table-utils'

type DataTableTranslation = (
  key: string,
  values?: Record<string, number>,
) => string

export function createDataTableLabels(
  dt: DataTableTranslation,
): DataTableLabels {
  return {
    clearFilters: dt('clearFilters'),
    columnVisibility: dt('columnVisibility'),
    errorRetry: dt('errorRetry'),
    errorTitle: dt('errorTitle'),
    firstPage: dt('firstPage'),
    lastPage: dt('lastPage'),
    loading: dt('loading'),
    nextPage: dt('nextPage'),
    of: dt('of'),
    page: dt('page'),
    perPage: dt('perPage'),
    previousPage: dt('previousPage'),
    resetColumns: dt('resetColumns'),
    rowsSelected: (selected: number, total: number) =>
      dt('rowsSelected', { selected, total }),
    visibleRows: (from: number, to: number, total: number) =>
      dt('visibleRows', { from, to, total }),
    filters: dt('filters'),
    applyFilters: dt('applyFilters'),
    cancelFilters: dt('cancelFilters'),
    activeFilters: dt('activeFilters'),
  }
}
