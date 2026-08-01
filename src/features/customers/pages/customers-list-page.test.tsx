import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { NuqsAdapter } from 'nuqs/adapters/react'
import { describe, expect, it, vi } from 'vitest'
import { TooltipProvider } from '#/components/ui/tooltip'
import { CustomersListPage } from './customers-list-page'

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

vi.mock('#/features/customers/hooks', () => ({
  useCustomersList: vi.fn(() => ({
    data: {
      rows: [
        {
          id: 'cust-123',
          name: 'Acme Corp',
          email: 'acme@test.com',
          phone: '08123456789',
          active: true,
          photoAssetId: null,
          createdAt: new Date().toISOString(),
        },
      ],
      totalRows: 1,
    },
    isFetching: false,
  })),
  useDeleteCustomer: vi.fn(() => ({
    mutateAsync: vi.fn(),
  })),
  useCustomerMaybe: vi.fn(() => ({ data: undefined, isLoading: true })),
  useCreateCustomer: vi.fn(() => ({
    mutateAsync: vi.fn().mockResolvedValue({ ok: true }),
  })),
  useUpdateCustomer: vi.fn(() => ({
    mutateAsync: vi.fn().mockResolvedValue({ ok: true }),
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

describe('CustomersListPage', () => {
  it('renders customers list page with table rows', () => {
    render(
      <TestWrapper>
        <CustomersListPage />
      </TestWrapper>,
    )

    expect(screen.getAllByText('Acme Corp')[0]).toBeDefined()
    expect(screen.getByText('customers.title')).toBeDefined()
  })

  it('renders side-sheet when sheet prop is set', () => {
    render(
      <TestWrapper>
        <CustomersListPage sheet={{ type: 'create' }} />
      </TestWrapper>,
    )

    // Form sheet should be open and display title
    expect(screen.getAllByText('customers.createCustomer')[0]).toBeDefined()
  })
})
