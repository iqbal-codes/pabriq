import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ProductFormSheet } from './product-form-sheet'

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

vi.mock('#/features/products/hooks', () => ({
  useProduct: vi.fn((id: string) => ({
    data: id
      ? {
          id,
          name: 'Mock Product',
          active: true,
          basePrice: 10000,
          productionDays: 1,
          minQuantity: 1,
        }
      : undefined,
    isLoading: false,
  })),
  useProductBreakpoints: vi.fn(() => ({
    data: [],
    isLoading: false,
  })),
  useProductAddons: vi.fn(() => ({
    data: [],
    isLoading: false,
  })),
  useCreateProduct: vi.fn(() => ({
    mutateAsync: vi.fn().mockResolvedValue({ ok: true }),
  })),
  useUpdateProduct: vi.fn(() => ({
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

describe('ProductFormSheet', () => {
  it('renders create mode', () => {
    const onOpenChange = vi.fn()
    const onSaved = vi.fn()

    render(
      <TestWrapper>
        <ProductFormSheet
          mode={{ type: 'create' }}
          open={true}
          onOpenChange={onOpenChange}
          onSaved={onSaved}
        />
      </TestWrapper>,
    )

    expect(screen.getByText('products.createTitle')).toBeDefined()
    expect(screen.getByText('products.createProduct')).toBeDefined()
  })

  it('renders edit mode', () => {
    const onOpenChange = vi.fn()
    const onSaved = vi.fn()

    render(
      <TestWrapper>
        <ProductFormSheet
          mode={{ type: 'edit', id: 'prod-1' }}
          open={true}
          onOpenChange={onOpenChange}
          onSaved={onSaved}
        />
      </TestWrapper>,
    )

    expect(screen.getByText('products.editTitle')).toBeDefined()
    expect(screen.getByText('products.updateProduct')).toBeDefined()
  })
})
