import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NuqsAdapter } from 'nuqs/adapters/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TooltipProvider } from '#/components/ui/tooltip'
import { ProductTemplatesPage } from './product-templates-page'

const { useProductTemplatesMock, useBusinessTemplatesMock } = vi.hoisted(
  () => ({
    useProductTemplatesMock: vi.fn(),
    useBusinessTemplatesMock: vi.fn(),
  }),
)

const mockOpenModal = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  useRouteContext: () => ({ org: { id: 'org-1' } }),
  useNavigate: () => vi.fn(),
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

vi.mock('#/hooks/use-global-overlay', () => ({
  useGlobalModal: () => ({ openModal: mockOpenModal }),
}))

const mockTemplates = [
  {
    id: 'template-1',
    orgId: 'org-1',
    businessTemplateId: null,
    businessTemplateItemKey: null,
    name: 'Custom Apparel',
    description: null,
    category: 'Apparel',
    status: 'active',
    configuration: {
      itemizationMode: 'uniform',
      fields: [],
      pricing: { basePrice: 0, productionDays: 1, minQuantity: 1 },
      production: { notes: null },
      workflowStages: [],
      bom: [],
    },
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  },
]

vi.mock('#/features/product-templates/hooks', () => ({
  useProductTemplates: useProductTemplatesMock,
  useBusinessTemplates: useBusinessTemplatesMock,
  useArchiveProductTemplate: vi.fn(() => ({
    mutateAsync: vi.fn().mockResolvedValue({ ok: true }),
    isPending: false,
  })),
  useDeleteProductTemplate: vi.fn(() => ({
    mutateAsync: vi.fn().mockResolvedValue({ ok: true }),
    isPending: false,
  })),
  useDuplicateProductTemplate: vi.fn(() => ({
    mutateAsync: vi.fn().mockResolvedValue({ ok: true }),
    isPending: false,
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

describe('ProductTemplatesPage', () => {
  beforeEach(() => {
    mockOpenModal.mockReset()
    useProductTemplatesMock.mockReturnValue({
      data: mockTemplates,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    })
    useBusinessTemplatesMock.mockReturnValue({
      data: [{ id: 'biz-1', name: 'Starter' }],
      isLoading: false,
      isError: false,
    })
  })

  it('renders the page header with the visible create management action', () => {
    render(
      <TestWrapper>
        <ProductTemplatesPage />
      </TestWrapper>,
    )

    expect(screen.getByText('productTemplates.title')).toBeDefined()
    expect(
      screen.getByRole('button', { name: 'productTemplates.create' }),
    ).toBeDefined()
  })

  it('opens the create form when the header create action is clicked', async () => {
    const user = userEvent.setup()
    render(
      <TestWrapper>
        <ProductTemplatesPage />
      </TestWrapper>,
    )

    await user.click(
      screen.getByRole('button', { name: 'productTemplates.create' }),
    )

    expect(mockOpenModal).toHaveBeenCalledWith('product-template-form')
  })

  it('shows the empty state with its create action when no templates exist', async () => {
    useProductTemplatesMock.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    })
    const user = userEvent.setup()
    render(
      <TestWrapper>
        <ProductTemplatesPage />
      </TestWrapper>,
    )

    expect(screen.getByText('productTemplates.noTemplates')).toBeDefined()
    expect(screen.getByText('productTemplates.noTemplatesDesc')).toBeDefined()

    const emptyCreate = screen.getAllByRole('button', {
      name: 'productTemplates.create',
    })
    await user.click(emptyCreate[emptyCreate.length - 1])

    expect(mockOpenModal).toHaveBeenCalledWith('product-template-form')
  })
})
