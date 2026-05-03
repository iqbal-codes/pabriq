import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { AppColumnDef, DataTableLabels } from '#/components/app/data-table'
import { DataTable } from '#/components/app/data-table'
import { TooltipProvider } from '#/components/ui/tooltip'

type Customer = {
  id: string
  name: string
  email: string | null
  active: boolean
}

const columns: AppColumnDef<Customer>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
    meta: { label: 'Name', mobileRole: 'title' },
  },
  {
    accessorKey: 'email',
    header: 'Email',
    meta: { label: 'Email', mobileRole: 'meta' },
  },
  {
    accessorKey: 'active',
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

const customers: Customer[] = [
  { id: '1', name: 'Acme Corp', email: 'acme@test.com', active: true },
  { id: '2', name: 'Beta Inc', email: 'beta@test.com', active: false },
]

function renderTable(
  overrides?: Partial<React.ComponentProps<typeof DataTable<Customer>>>,
) {
  return render(
    <TooltipProvider>
      <DataTable
        columns={columns}
        data={customers}
        getRowId={(row) => row.id}
        labels={labels}
        onPageChange={() => {}}
        onPerPageChange={() => {}}
        page={1}
        perPage={25}
        tableId="customers-test"
        totalRows={customers.length}
        {...overrides}
      />
    </TooltipProvider>,
  )
}

describe('customer list table', () => {
  it('renders customer names', () => {
    renderTable()
    expect(screen.getAllByText('Acme Corp').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Beta Inc').length).toBeGreaterThanOrEqual(1)
  })

  it('shows email for each customer', () => {
    renderTable()
    expect(screen.getAllByText('acme@test.com').length).toBeGreaterThanOrEqual(
      1,
    )
    expect(screen.getAllByText('beta@test.com').length).toBeGreaterThanOrEqual(
      1,
    )
  })
})
