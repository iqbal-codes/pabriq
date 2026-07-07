import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { NuqsAdapter } from 'nuqs/adapters/react'
import { describe, expect, it, vi } from 'vitest'
import { TooltipProvider } from '#/components/ui/tooltip'
import { OrdersListPage } from './orders-list-page'

const mockNavigate = vi.fn()
vi.mock('@tanstack/react-router', () => ({
  useRouteContext: () => ({ org: { id: 'org-1' } }),
  useNavigate: () => mockNavigate,
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}))

vi.mock('use-intl', () => ({
  useTranslations: (namespace?: string) => {
    return (key: string) => (namespace ? `${namespace}.${key}` : key)
  },
  useLocale: () => 'en',
  IntlProvider: ({ children }: { children: React.ReactNode }) => children,
}))

vi.mock('#/features/orders/hooks', () => ({
  useOrdersList: vi.fn(() => ({
    data: {
      rows: [
        {
          id: 'ord-123',
          orderNumber: 'ORD-001',
          customerName: 'Acme Corp',
          status: 'draft',
          total: 100000,
          createdAt: new Date().toISOString(),
        },
      ],
      totalRows: 1,
    },
    error: null,
    isFetching: false,
    isLoading: false,
    refetch: vi.fn(),
  })),
  useOrderCreationReadiness: vi.fn(() => ({
    data: { isReady: true },
    isLoading: false,
  })),
  useOrder: vi.fn(() => ({ data: undefined, isLoading: true })),
  useCreateDraftOrder: vi.fn(() => ({
    mutateAsync: vi
      .fn()
      .mockResolvedValue({ ok: true, order: { id: 'ord-123' } }),
  })),
  useUpdateDraftOrder: vi.fn(() => ({
    mutateAsync: vi.fn().mockResolvedValue({ ok: true }),
  })),
}))

vi.mock('#/features/customers/hooks', () => ({
  useCustomersList: vi.fn(() => ({
    data: { rows: [], totalRows: 0 },
    isLoading: false,
  })),
  useCreateCustomer: vi.fn(() => ({
    mutateAsync: vi.fn().mockResolvedValue({ ok: true }),
  })),
}))

vi.mock('#/features/products/hooks', () => ({
  useProductsList: vi.fn(() => ({
    data: { rows: [], totalRows: 0 },
    isLoading: false,
  })),
}))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
})

function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <NuqsAdapter>{children}</NuqsAdapter>
      </TooltipProvider>
    </QueryClientProvider>
  )
}

describe('OrdersListPage', () => {
  it('renders orders list page with table rows', () => {
    render(
      <TestWrapper>
        <OrdersListPage />
      </TestWrapper>,
    )

    expect(screen.getAllByText('ORD-001')[0]).toBeDefined()
    expect(screen.getByText('orders.title')).toBeDefined()
  })

  it('renders side-sheet when sheet prop is set', () => {
    render(
      <TestWrapper>
        <OrdersListPage sheet={{ type: 'create' }} />
      </TestWrapper>,
    )

    // Form sheet should be open and display title
    expect(screen.getAllByText('orders.createOrder')[0]).toBeDefined()
  })
})
