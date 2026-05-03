import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { TooltipProvider } from '#/components/ui/tooltip'
import { DataTable } from './data-table'
import { DataTableSearch } from './data-table-search'
import type {
  AppColumnDef,
  DataTableFiltersConfig,
  DataTableLabels,
} from './data-table-utils'
import {
  encodeSort,
  getActiveFilterCount,
  getStoredVisibility,
  isFilterActive,
  removeStoredVisibility,
  setStoredVisibility,
} from './data-table-utils'

type Item = { id: string; name: string; status: string }

const columns: AppColumnDef<Item>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
    meta: { label: 'Name', mobileRole: 'title' },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    meta: { label: 'Status', mobileRole: 'badge' },
  },
]

const labels: DataTableLabels = {
  clearFilters: 'Clear filters',
  columnVisibility: 'Columns',
  errorRetry: 'Retry',
  errorTitle: 'Something went wrong',
  firstPage: 'First page',
  lastPage: 'Last page',
  loading: 'Loading',
  nextPage: 'Next page',
  of: 'of',
  page: 'Page',
  perPage: 'Per page',
  previousPage: 'Previous page',
  resetColumns: 'Reset columns',
  rowsSelected: (s: number, _t: number) => `${s} selected`,
  visibleRows: (from: number, to: number, total: number) =>
    `${from}-${to} of ${total}`,
}

const data: Item[] = [
  { id: '1', name: 'Alpha', status: 'active' },
  { id: '2', name: 'Beta', status: 'inactive' },
  { id: '3', name: 'Gamma', status: 'active' },
]

function renderTable(
  overrides?: Partial<React.ComponentProps<typeof DataTable<Item>>>,
) {
  return render(
    <TooltipProvider>
      <DataTable
        columns={columns}
        data={data}
        getRowId={(row) => row.id}
        labels={labels}
        onPageChange={vi.fn()}
        onPerPageChange={vi.fn()}
        page={1}
        perPage={25}
        tableId="test-table"
        totalRows={data.length}
        {...overrides}
      />
    </TooltipProvider>,
  )
}

describe('DataTable - row rendering', () => {
  it('renders table headers from column definitions', () => {
    renderTable()
    expect(screen.getByText('Name')).toBeDefined()
    expect(screen.getByText('Status')).toBeDefined()
  })

  it('renders data rows', () => {
    renderTable()
    expect(screen.getAllByText('Alpha').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Beta').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Gamma').length).toBeGreaterThanOrEqual(1)
  })

  it('renders visible rows label', () => {
    renderTable()
    expect(screen.getByText('1-3 of 3')).toBeDefined()
  })
})

describe('DataTable - loading state', () => {
  it('shows skeleton rows when isLoading is true', () => {
    const { container } = renderTable({ isLoading: true, data: [] })
    const skeletons = container.querySelectorAll('[data-slot="skeleton"]')
    expect(skeletons.length).toBeGreaterThan(0)
  })
})

describe('DataTable - error state', () => {
  it('shows error title and message', () => {
    renderTable({ error: 'Network error', data: [], totalRows: 0 })
    expect(screen.getByText('Something went wrong')).toBeDefined()
    expect(screen.getByText('Network error')).toBeDefined()
  })
})

describe('DataTable - empty state', () => {
  it('shows default empty state when no data and no filters', () => {
    renderTable({ data: [], totalRows: 0 })
    expect(screen.getByText('Loading')).toBeDefined()
  })

  it('shows custom empty state from structured props', () => {
    renderTable({
      data: [],
      totalRows: 0,
      emptyTitle: 'No items',
      emptyDescription: 'Add your first item.',
    })
    expect(screen.getByText('No items')).toBeDefined()
    expect(screen.getByText('Add your first item.')).toBeDefined()
  })
})

describe('DataTable - no results state', () => {
  it('shows no results when data is empty with active filters', () => {
    renderTable({
      data: [],
      totalRows: 0,
      hasActiveFilters: true,
      onClearFilters: vi.fn(),
    })
    expect(screen.getByText('Clear filters')).toBeDefined()
  })
})

describe('DataTable - pagination callbacks', () => {
  it('calls onPageChange when next button clicked', async () => {
    const onPageChange = vi.fn()
    renderTable({ totalRows: 50, onPageChange })
    const nextBtn = screen.getByLabelText('Next page')
    await userEvent.click(nextBtn)
    expect(onPageChange).toHaveBeenCalledWith(2)
  })

  it('calls onPageChange when previous button clicked', async () => {
    const onPageChange = vi.fn()
    renderTable({ page: 2, totalRows: 50, onPageChange })
    const prevBtn = screen.getByLabelText('Previous page')
    await userEvent.click(prevBtn)
    expect(onPageChange).toHaveBeenCalledWith(1)
  })

  it('calls onPerPageChange when per page select changes', async () => {
    const onPerPageChange = vi.fn()
    renderTable({ totalRows: 50, onPerPageChange })
    const select = screen.getByLabelText('Per page')
    await userEvent.selectOptions(select, '50')
    expect(onPerPageChange).toHaveBeenCalledWith(50)
  })
})

describe('DataTable - sort callback encoding', () => {
  it('calls onSortChange when sortable header is clicked', async () => {
    const onSortChange = vi.fn()
    renderTable({ onSortChange })

    const nameHeader = screen.getByText('Name')
    await userEvent.click(nameHeader)

    expect(onSortChange).toHaveBeenCalledWith({
      field: 'name',
      direction: 'asc',
    })
  })

  it('toggles sort direction on second click', async () => {
    const onSortChange = vi.fn()
    renderTable({ sort: { field: 'name', direction: 'asc' }, onSortChange })

    const nameHeader = screen.getByText('Name')
    await userEvent.click(nameHeader)

    expect(onSortChange).toHaveBeenCalledWith({
      field: 'name',
      direction: 'desc',
    })
  })
})

describe('DataTable - column visibility persistence', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('stores visibility by tableId', () => {
    setStoredVisibility('test-table', { name: true, status: false })
    const stored = getStoredVisibility('test-table')
    expect(stored).toEqual({ name: true, status: false })
  })

  it('resets visibility for the current table only', () => {
    setStoredVisibility('test-table', { name: false })
    setStoredVisibility('other-table', { name: false })
    removeStoredVisibility('test-table')
    expect(getStoredVisibility('test-table')).toEqual({})
    expect(getStoredVisibility('other-table')).toEqual({ name: false })
  })
})

describe('DataTable - toolbar', () => {
  it('renders toolbarStart content', () => {
    renderTable({ toolbarStart: <button type="button">Custom Action</button> })
    expect(screen.getByText('Custom Action')).toBeDefined()
  })
})

describe('DataTable - filter trigger', () => {
  const baseFilters: DataTableFiltersConfig = {
    definitions: [
      { id: 'status', label: 'Status', type: 'radio-chips', options: [] },
    ],
    values: {},
    onApply: vi.fn(),
    onClear: vi.fn(),
  }

  it('renders filter trigger button when filters prop is provided', () => {
    renderTable({ filters: baseFilters })
    expect(screen.getByText('Filters')).toBeDefined()
  })

  it('does not render filter button without filters prop', () => {
    renderTable()
    expect(screen.queryByText('Filters')).toBeNull()
  })

  it('shows active count badge when filters have values', () => {
    renderTable({
      filters: {
        ...baseFilters,
        values: { status: 'active' },
      },
    })
    const counts = screen.getAllByText('1').filter((el) => el.closest('button'))
    expect(counts.length).toBeGreaterThanOrEqual(1)
  })

  it('does not show count badge when no filters active', () => {
    renderTable({ filters: baseFilters })
    const counts = screen
      .queryAllByText('1')
      .filter((el) => el.closest('button'))
    expect(counts.length).toBe(0)
  })

  it('opens filter panel on trigger click', async () => {
    renderTable({ filters: baseFilters })
    const user = userEvent.setup({ pointerEventsCheck: 0 })
    await user.click(screen.getByText('Filters'))
    const applyBtn = await screen.findByText('Apply', {}, { timeout: 2000 })
    expect(applyBtn).toBeDefined()
  })
})

describe('DataTable - filter panel', () => {
  const onApply = vi.fn()
  const onClear = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  const filtersWithValues: DataTableFiltersConfig = {
    definitions: [
      {
        id: 'status',
        label: 'Status',
        type: 'radio-chips',
        options: [
          { value: 'active', label: 'Active' },
          { value: 'inactive', label: 'Inactive' },
        ],
      },
    ],
    values: { status: 'active' },
    onApply,
    onClear,
  }

  it('shows filter definitions inside the panel', async () => {
    renderTable({ filters: filtersWithValues })
    const user = userEvent.setup({ pointerEventsCheck: 0 })
    await user.click(screen.getByText('Filters'))
    const allBtns = await screen.findAllByText('Active', {}, { timeout: 2000 })
    expect(allBtns.length).toBeGreaterThan(0)
  })

  it('shows Apply and Cancel buttons inside the panel', async () => {
    renderTable({ filters: filtersWithValues })
    const user = userEvent.setup({ pointerEventsCheck: 0 })
    await user.click(screen.getByText('Filters'))
    expect(
      await screen.findByText('Apply', {}, { timeout: 2000 }),
    ).toBeDefined()
    expect(
      await screen.findByText('Cancel', {}, { timeout: 2000 }),
    ).toBeDefined()
  })

  it('calls onClear when Clear all is clicked in the panel', async () => {
    renderTable({ filters: filtersWithValues })
    const user = userEvent.setup({ pointerEventsCheck: 0 })
    await user.click(screen.getByText('Filters'))
    const dialog = await screen.findByRole('dialog', {}, { timeout: 2000 })
    const clearBtn = within(dialog).getByText('Clear filters')
    await user.click(clearBtn)
    expect(onClear).toHaveBeenCalled()
  })

  it('renders custom content in the panel', async () => {
    renderTable({
      filters: {
        ...filtersWithValues,
        customContent: <div>Custom section</div>,
      },
    })
    const user = userEvent.setup({ pointerEventsCheck: 0 })
    await user.click(screen.getByText('Filters'))
    expect(
      await screen.findByText('Custom section', {}, { timeout: 2000 }),
    ).toBeDefined()
  })
})

describe('DataTable - active filter chips', () => {
  const onApply = vi.fn()

  it('renders active chips when filters have values', () => {
    renderTable({
      filters: {
        definitions: [
          {
            id: 'status',
            label: 'Status',
            type: 'radio-chips',
            options: [
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
            ],
          },
        ],
        values: { status: 'active' },
        onApply,
        onClear: vi.fn(),
      },
    })
    expect(screen.getByText('Active')).toBeDefined()
  })

  it('does not render chips when no filters active', () => {
    renderTable({
      filters: {
        definitions: [
          {
            id: 'status',
            label: 'Status',
            type: 'radio-chips',
            options: [],
          },
        ],
        values: {},
        onApply,
        onClear: vi.fn(),
      },
    })
    expect(screen.queryByText(/Status:/)).toBeNull()
  })
})

describe('getActiveFilterCount', () => {
  it('counts active string filter', () => {
    const defs = [
      {
        id: 'status',
        label: 'Status',
        type: 'radio-chips' as const,
        options: [],
      },
    ]
    expect(getActiveFilterCount(defs, { status: 'active' })).toBe(1)
    expect(getActiveFilterCount(defs, { status: null })).toBe(0)
    expect(getActiveFilterCount(defs, { status: '' })).toBe(0)
    expect(getActiveFilterCount(defs, {})).toBe(0)
  })

  it('counts active multi-select filter', () => {
    const defs = [
      {
        id: 'tags',
        label: 'Tags',
        type: 'combobox-multi' as const,
        options: [],
      },
    ]
    expect(getActiveFilterCount(defs, { tags: ['a', 'b'] })).toBe(1)
    expect(getActiveFilterCount(defs, { tags: [] })).toBe(0)
  })

  it('counts active date range filter', () => {
    const defs = [{ id: 'date', label: 'Date', type: 'date-range' as const }]
    expect(
      getActiveFilterCount(defs, { date: { from: '2026-01-01', to: null } }),
    ).toBe(1)
    expect(
      getActiveFilterCount(defs, {
        date: { from: '2026-01-01', to: '2026-01-31' },
      }),
    ).toBe(1)
    expect(getActiveFilterCount(defs, { date: { from: null, to: null } })).toBe(
      0,
    )
  })

  it('counts filter groups, not values', () => {
    const defs = [
      {
        id: 'status',
        label: 'Status',
        type: 'radio-chips' as const,
        options: [],
      },
      {
        id: 'tags',
        label: 'Tags',
        type: 'combobox-multi' as const,
        options: [],
      },
    ]
    expect(
      getActiveFilterCount(defs, { status: 'active', tags: ['a', 'b', 'c'] }),
    ).toBe(2)
  })
})

describe('isFilterActive', () => {
  it('returns true for non-null string', () => {
    const def = {
      id: 's',
      label: 'S',
      type: 'radio-chips' as const,
      options: [],
    }
    expect(isFilterActive(def, 'active')).toBe(true)
    expect(isFilterActive(def, '')).toBe(false)
    expect(isFilterActive(def, null)).toBe(false)
  })

  it('returns true for non-empty array', () => {
    const def = {
      id: 't',
      label: 'T',
      type: 'combobox-multi' as const,
      options: [],
    }
    expect(isFilterActive(def, ['a'])).toBe(true)
    expect(isFilterActive(def, [])).toBe(false)
  })

  it('returns true for date range with any value', () => {
    const def = { id: 'd', label: 'D', type: 'date-range' as const }
    expect(isFilterActive(def, { from: '2026-01-01', to: null })).toBe(true)
    expect(isFilterActive(def, { from: null, to: '2026-01-31' })).toBe(true)
    expect(isFilterActive(def, { from: null, to: null })).toBe(false)
  })
})

describe('DataTable - row actions', () => {
  it('renders row action buttons', () => {
    renderTable({
      rowActions: (row) => (
        <button type="button" onClick={() => {}}>
          Edit {row.name}
        </button>
      ),
    })
    expect(screen.getByText('Edit Alpha')).toBeDefined()
  })
})

describe('DataTableSearch', () => {
  it('renders search input with placeholder', () => {
    render(
      <DataTableSearch placeholder="Search..." value="" onChange={vi.fn()} />,
    )
    expect(screen.getByPlaceholderText('Search...')).toBeDefined()
  })
})

describe('encodeSort', () => {
  it('encodes field and direction', () => {
    expect(encodeSort('name', 'asc')).toBe('name:asc')
    expect(encodeSort('createdAt', 'desc')).toBe('createdAt:desc')
  })
})
