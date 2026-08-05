import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { IntlProvider } from 'use-intl'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { messages } from '#/messages'

const mockListUserOrgs = vi.fn()
const mockBusinessTemplates = vi.fn()

vi.mock('#/features/auth/org', () => ({
  createOrganization: vi.fn(),
  listUserOrgs: (...args: unknown[]) => mockListUserOrgs(...args),
  setOrganizationLogo: vi.fn(),
}))

vi.mock('#/features/product-templates/server', () => ({
  listBusinessTemplatesFn: (...args: unknown[]) =>
    mockBusinessTemplates(...args),
}))

vi.mock('#/lib/auth-session', () => ({
  getCurrentSession: vi.fn().mockResolvedValue({ user: { id: 'user-1' } }),
}))

vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-router')>(
    '@tanstack/react-router',
  )
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  }
})

async function renderPage() {
  const { Route } = await import('./onboarding')
  const Component = Route.options.component
  if (!Component) throw new Error('Onboarding component is unavailable')
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  render(
    <IntlProvider locale="en" messages={messages.en}>
      <QueryClientProvider client={queryClient}>
        <Component />
      </QueryClientProvider>
    </IntlProvider>,
  )
}

beforeEach(() => {
  mockListUserOrgs.mockResolvedValue([])
  mockBusinessTemplates.mockResolvedValue([
    {
      id: 'business-1',
      slug: 'custom-apparel',
      name: 'Custom Apparel',
      description: 'Starter products',
      active: true,
      configuration: { productTemplates: [] },
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ])
})

describe('onboarding business model selection', () => {
  it('renders business model selection with radio options', async () => {
    await renderPage()

    expect(await screen.findByLabelText('Business model')).toBeDefined()
    expect(screen.getByText('Custom Apparel')).toBeDefined()
    expect(
      screen.getByRole('button', { name: 'Create Organization' }),
    ).toBeEnabled()
  })

  it('shows an unavailable state when no business models exist', async () => {
    mockBusinessTemplates.mockResolvedValue([])
    await renderPage()

    expect(
      await screen.findByText('Business models are currently unavailable.'),
    ).toBeDefined()
    expect(
      screen.getByRole('button', { name: 'Create Organization' }),
    ).toBeDisabled()
  })
})
