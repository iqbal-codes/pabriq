import { useCallback, useEffect, useState } from 'react'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '#/components/ui/drawer'
import { DataTableFilterChips } from './data-table-filter-chips'
import { DataTableFilterCombobox } from './data-table-filter-combobox'
import { DataTableFilterDate } from './data-table-filter-date'
import type {
  DataTableFilterLabels,
  DataTableFilterValues,
  FilterDefinition,
  FilterDefinitions,
  FilterValue,
} from './data-table-utils'

type DataTableFilterPanelProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  definitions: FilterDefinitions
  committedValues: DataTableFilterValues
  onApply: (values: DataTableFilterValues) => void
  onClear: () => void
  labels: DataTableFilterLabels & { clearFilters: string }
  customContent?: React.ReactNode
}

function FilterControl({
  def,
  value,
  onChange,
}: {
  def: FilterDefinition
  value: FilterValue
  onChange: (value: FilterValue) => void
}) {
  switch (def.type) {
    case 'combobox-single':
      return (
        <DataTableFilterCombobox
          mode="single"
          options={def.options}
          placeholder={def.placeholder}
          value={value as string | null}
          onChange={onChange}
          searchPlaceholder={def.placeholder ?? 'Search...'}
          noOptionsLabel="No options"
        />
      )
    case 'combobox-multi':
      return (
        <DataTableFilterCombobox
          mode="multi"
          options={def.options}
          placeholder={def.placeholder}
          value={value as string[]}
          onChange={onChange}
          searchPlaceholder={def.placeholder ?? 'Search...'}
          noOptionsLabel="No options"
        />
      )
    case 'date-single':
      return (
        <DataTableFilterDate
          mode="single"
          value={value as string | null}
          onChange={onChange}
          placeholder={def.placeholder}
        />
      )
    case 'date-range':
      return (
        <DataTableFilterDate
          mode="range"
          value={
            (value as { from: string | null; to: string | null }) ?? {
              from: null,
              to: null,
            }
          }
          onChange={onChange}
          placeholder={def.placeholder}
        />
      )
    case 'radio-chips':
      return (
        <DataTableFilterChips
          options={def.options}
          value={value as string | null}
          onChange={onChange}
        />
      )
    case 'custom':
      return def.render({
        value,
        onChange,
      })
    default:
      return null
  }
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    setIsMobile(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return isMobile
}

export function DataTableFilterPanel({
  open,
  onOpenChange,
  definitions,
  committedValues,
  onApply,
  onClear,
  labels,
  customContent,
}: DataTableFilterPanelProps) {
  const [draft, setDraft] = useState<DataTableFilterValues>({})
  const isMobile = useIsMobile()

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        setDraft({})
      }
      onOpenChange(nextOpen)
    },
    [onOpenChange],
  )

  const handleApply = useCallback(() => {
    const next: DataTableFilterValues = {}
    for (const def of definitions) {
      const v = draft[def.id]
      if (v !== undefined) {
        next[def.id] = v
      } else {
        next[def.id] = committedValues[def.id]
      }
    }
    onApply(next)
    setDraft({})
    onOpenChange(false)
  }, [definitions, draft, committedValues, onApply, onOpenChange])

  const handleClear = useCallback(() => {
    setDraft({})
    onClear()
    onOpenChange(false)
  }, [onClear, onOpenChange])

  const handleValueChange = useCallback((id: string, value: FilterValue) => {
    setDraft((prev) => ({ ...prev, [id]: value }))
  }, [])

  const content = (
    <div className="space-y-6">
      {definitions.length > 0 && (
        <div className="space-y-5">
          {definitions.map((def) => {
            const draftValue = draft[def.id]
            const committedValue = committedValues[def.id]
            const value = draftValue !== undefined ? draftValue : committedValue
            return (
              <div key={def.id}>
                <span className="mb-1.5 block text-sm font-medium">
                  {def.label}
                </span>
                <FilterControl
                  def={def}
                  value={value}
                  onChange={(v) => handleValueChange(def.id, v)}
                />
              </div>
            )
          })}
        </div>
      )}
      {customContent && <div>{customContent}</div>}
    </div>
  )

  const footer = (
    <div className="flex items-center justify-between gap-2">
      <Button variant="ghost" size="sm" onClick={handleClear}>
        {labels.clearFilters}
      </Button>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleOpenChange(false)}
        >
          {labels.cancelFilters}
        </Button>
        <Button size="sm" onClick={handleApply}>
          {labels.applyFilters}
        </Button>
      </div>
    </div>
  )

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={handleOpenChange}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{labels.filters}</DrawerTitle>
          </DrawerHeader>
          <div className="max-h-[60vh] overflow-y-auto px-4">{content}</div>
          <DrawerFooter>{footer}</DrawerFooter>
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{labels.filters}</DialogTitle>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto px-1">{content}</div>
        <DialogFooter>{footer}</DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
