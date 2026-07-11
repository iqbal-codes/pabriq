import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { IntlProvider } from 'use-intl'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ProductionPage } from './production-page'

const mockThreeColumnPage = vi.hoisted(() =>
  vi.fn(({ orgId }: { orgId: string }) => (
    <div data-testid="three-column-page" data-org-id={orgId}>
      Three Column Mock
    </div>
  )),
)

vi.mock('./three-column-page', () => ({
  ThreeColumnPage: mockThreeColumnPage,
}))

const enMessages = {
  production: {},
}

function renderPage(props: { orgId: string }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <IntlProvider locale="en" messages={enMessages}>
        <ProductionPage {...props} />
      </IntlProvider>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  mockThreeColumnPage.mockClear()
})

describe('ProductionPage', () => {
  it('renders ThreeColumnPage directly', () => {
    renderPage({ orgId: 'org-1' })
    expect(screen.getByTestId('three-column-page')).toBeDefined()
  })

  it('passes orgId to ThreeColumnPage', () => {
    renderPage({ orgId: 'org-1' })
    const pane = screen.getByTestId('three-column-page')
    expect(pane.getAttribute('data-org-id')).toBe('org-1')
  })
})
