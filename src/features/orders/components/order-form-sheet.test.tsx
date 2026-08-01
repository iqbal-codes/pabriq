import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { OrderFormSheet } from './order-form-sheet'

const mockReadiness = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
  useNavigate: () => vi.fn(),
  useParams: () => ({}),
  useRouteContext: () => ({ org: { id: 'org-1' } }),
}))

vi.mock('use-intl', () => ({
  useTranslations: (namespace?: string) => {
    return (key: string) => (namespace ? `${namespace}.${key}` : key)
  },
  useLocale: () => 'en',
  IntlProvider: ({ children }: { children: React.ReactNode }) => children,
}))

vi.mock('#/features/orders/hooks', () => ({
  useOrderCreationReadiness: () => mockReadiness(),
  useOrder: vi.fn((id: string) => ({
    data: id
      ? {
          order: { id, customerId: 'cust-1', notes: 'Test Notes' },
          lineItems: [],
        }
      : undefined,
    isLoading: false,
  })),
  useOrderMaybe: vi.fn((params: { id: string }) => ({
    data: params.id
      ? {
          order: { id: params.id, customerId: 'cust-1', notes: 'Test Notes' },
          lineItems: [],
        }
      : undefined,
    isLoading: false,
  })),
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
    data: { rows: [{ id: 'cust-1', name: 'John Doe' }], totalRows: 1 },
    isLoading: false,
  })),
  useCreateCustomer: vi.fn(() => ({
    mutateAsync: vi.fn().mockResolvedValue({ ok: true }),
  })),
}))

vi.mock('#/features/products/hooks', () => ({
  useProductsList: vi.fn(() => ({
    data: {
      rows: [
        { id: 'prod-1', name: 'Custom T-Shirt', negotiateAboveQuantity: null },
      ],
      totalRows: 1,
    },
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
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('OrderFormSheet', () => {
  it('renders readiness overlay when order creation is not ready', () => {
    mockReadiness.mockReturnValue({
      data: { isReady: false, missingTasks: ['add-product'] },
      isLoading: false,
    })

    const onOpenChange = vi.fn()
    const onSaved = vi.fn()

    render(
      <TestWrapper>
        <OrderFormSheet
          mode={{ type: 'create' }}
          orgId="org-1"
          open={true}
          onOpenChange={onOpenChange}
          onSaved={onSaved}
        />
      </TestWrapper>,
    )

    // Should display setup required/mission overlay info
    expect(screen.getByText('orders.setupBusinessAddressTitle')).toBeDefined()
  })

  it('renders form fields when ready', () => {
    mockReadiness.mockReturnValue({
      data: { isReady: true },
      isLoading: false,
    })

    const onOpenChange = vi.fn()
    const onSaved = vi.fn()

    render(
      <TestWrapper>
        <OrderFormSheet
          mode={{ type: 'create' }}
          orgId="org-1"
          open={true}
          onOpenChange={onOpenChange}
          onSaved={onSaved}
        />
      </TestWrapper>,
    )

    expect(screen.getByText('orders.createOrder')).toBeDefined()
  })
})
