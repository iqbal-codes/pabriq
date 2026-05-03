import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { TooltipProvider } from '#/components/ui/tooltip'
import { DataTable } from './data-table'
import { DataTableFilterSelect } from './data-table-filter-select'
import { DataTableSearch } from './data-table-search'
import type { AppColumnDef, DataTableLabels } from './data-table-utils'
import {
  encodeSort,
  getStoredVisibility,
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

describe('DataTableFilterSelect', () => {
  it('renders options', () => {
    render(
      <DataTableFilterSelect
        options={[
          { value: 'active', label: 'Active' },
          { value: 'inactive', label: 'Inactive' },
        ]}
        value=""
        onChange={vi.fn()}
      />,
    )
    expect(screen.getByText('Active')).toBeDefined()
    expect(screen.getByText('Inactive')).toBeDefined()
  })
})

describe('encodeSort', () => {
  it('encodes field and direction', () => {
    expect(encodeSort('name', 'asc')).toBe('name:asc')
    expect(encodeSort('createdAt', 'desc')).toBe('createdAt:desc')
  })
})
