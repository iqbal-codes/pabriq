import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { NuqsAdapter } from 'nuqs/adapters/react'
import { describe, expect, it, vi } from 'vitest'
import { TooltipProvider } from '#/components/ui/tooltip'
import { ProductsListPage } from './products-list-page'

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

vi.mock('#/features/products/hooks', () => ({
  useProductsList: vi.fn(() => ({
    data: {
      rows: [
        {
          id: 'prod-123',
          name: 'Classic Tee',
          active: true,
          basePrice: 50000,
          minDiscountPrice: null,
          createdAt: new Date().toISOString(),
        },
      ],
      totalRows: 1,
    },
    isFetching: false,
  })),
  useDeleteProduct: vi.fn(() => ({
    mutateAsync: vi.fn(),
  })),
  useProduct: vi.fn(() => ({ data: undefined, isLoading: true })),
  useProductBreakpoints: vi.fn(() => ({ data: undefined, isLoading: true })),
  useProductAddons: vi.fn(() => ({ data: undefined, isLoading: true })),
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
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <NuqsAdapter>{children}</NuqsAdapter>
      </TooltipProvider>
    </QueryClientProvider>
  )
}

describe('ProductsListPage', () => {
  it('renders products list page with table rows', () => {
    render(
      <TestWrapper>
        <ProductsListPage />
      </TestWrapper>,
    )

    expect(screen.getAllByText('Classic Tee')[0]).toBeDefined()
    expect(screen.getByText('products.title')).toBeDefined()
  })

  it('renders side-sheet when sheet prop is set', () => {
    render(
      <TestWrapper>
        <ProductsListPage sheet={{ type: 'create' }} />
      </TestWrapper>,
    )

    // Form sheet should be open and display title
    expect(screen.getByText('products.createTitle')).toBeDefined()
  })
})
