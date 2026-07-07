import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CustomerFormSheet } from './customer-form-sheet'

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

vi.mock('#/features/customers/hooks', () => ({
  useCustomer: vi.fn((id: string) => ({
    data: id
      ? { id, name: 'John Doe', email: 'john@example.com', active: true }
      : undefined,
    isLoading: false,
  })),
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
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('CustomerFormSheet', () => {
  it('renders create mode', () => {
    const onOpenChange = vi.fn()
    const onSaved = vi.fn()

    render(
      <TestWrapper>
        <CustomerFormSheet
          mode={{ type: 'create' }}
          open={true}
          onOpenChange={onOpenChange}
          onSaved={onSaved}
        />
      </TestWrapper>,
    )

    expect(screen.getByText('customers.createCustomer')).toBeDefined()
  })

  it('renders edit mode', () => {
    const onOpenChange = vi.fn()
    const onSaved = vi.fn()

    render(
      <TestWrapper>
        <CustomerFormSheet
          mode={{ type: 'edit', id: 'cust-1' }}
          open={true}
          onOpenChange={onOpenChange}
          onSaved={onSaved}
        />
      </TestWrapper>,
    )

    expect(screen.getByText('customers.editCustomer')).toBeDefined()
  })
})
