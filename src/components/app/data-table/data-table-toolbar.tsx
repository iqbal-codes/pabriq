import type { ReactNode } from 'react'
import type { DataTableSlotContext } from './data-table-utils'

type DataTableToolbarProps<TData> = {
  toolbarStart?: ReactNode
  toolbarEnd?: ReactNode
  selectionToolbar?: (ctx: DataTableSlotContext<TData>) => ReactNode
  slotContext: DataTableSlotContext<TData>
  filterTrigger?: ReactNode
  clearButton?: ReactNode
  activeFilterChips?: ReactNode
  hasStructuredFilters?: boolean
  inlineFilters?: ReactNode
}

export function DataTableToolbar<TData>({
  toolbarStart,
  toolbarEnd,
  selectionToolbar,
  slotContext,
  filterTrigger,
  clearButton,
  activeFilterChips,
  hasStructuredFilters,
  inlineFilters,
}: DataTableToolbarProps<TData>) {
  const hasSelection = slotContext.selectedRowIds.length > 0
  const hasToolbarContent = !!(
    toolbarStart ||
    toolbarEnd ||
    filterTrigger ||
    inlineFilters
  )

  return (
    <div className="flex flex-col gap-4">
      {hasSelection && selectionToolbar ? (
        <div className="flex items-center justify-between gap-2 rounded-md border bg-muted/30 px-3 py-2">
          <p className="text-sm text-muted-foreground">
            {slotContext.totalRows > 0
              ? `${slotContext.selectedRowIds.length} selected`
              : null}
          </p>
          <div className="flex items-center gap-2">
            {selectionToolbar(slotContext)}
          </div>
        </div>
      ) : null}

      {!hasSelection && hasToolbarContent ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2">{toolbarStart}</div>
            {inlineFilters && (
              <div className="hidden h-5 w-px bg-border md:block" />
            )}
            {inlineFilters}
            <div className="flex items-center gap-2 ml-auto">
              {toolbarEnd}
              {hasStructuredFilters && clearButton}
              {filterTrigger}
            </div>
          </div>
          {activeFilterChips}
        </>
      ) : null}
    </div>
  )
}
