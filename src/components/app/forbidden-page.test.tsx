import { render, screen } from '@testing-library/react'
import { IntlProvider } from 'use-intl'
import { describe, expect, it, vi } from 'vitest'
import { ForbiddenPage } from './forbidden-page'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children }: { to: string; children: React.ReactNode }) => (
    <a href={to}>{children}</a>
  ),
}))

const enMessages = {
  operator: {
    accessDeniedTitle: 'Access denied',
    accessDeniedDescription: "You don't have access to this page.",
    backToProduction: 'Back to production',
    backToDashboard: 'Back to dashboard',
    noOrgHeader: 'No organization',
    noOrgTitle: 'No organization assigned',
    noOrgDescription: 'Your account is not a member of any organization.',
    theme: 'Theme',
  },
}

function renderPage(props: {
  actionHref: '/' | '/operator'
  actionKey: 'backToDashboard' | 'backToProduction'
}) {
  return render(
    <IntlProvider locale="en" messages={enMessages}>
      <ForbiddenPage {...props} />
    </IntlProvider>,
  )
}

describe('ForbiddenPage', () => {
  it('renders the access denied title', () => {
    renderPage({ actionHref: '/', actionKey: 'backToDashboard' })
    expect(screen.getByText('Access denied')).toBeDefined()
  })

  it('renders the access denied description', () => {
    renderPage({ actionHref: '/', actionKey: 'backToDashboard' })
    expect(
      screen.getByText("You don't have access to this page."),
    ).toBeDefined()
  })

  it('renders action link pointing to the provided actionHref', () => {
    renderPage({ actionHref: '/operator', actionKey: 'backToProduction' })
    const link = screen.getByRole('link')
    expect(link).toBeDefined()
    expect(link.getAttribute('href')).toBe('/operator')
  })

  it('renders action link with translated label from actionKey', () => {
    renderPage({ actionHref: '/', actionKey: 'backToDashboard' })
    expect(screen.getByText('Back to dashboard')).toBeDefined()
  })

  it('renders back-to-production label when actionKey is backToProduction', () => {
    renderPage({ actionHref: '/operator', actionKey: 'backToProduction' })
    expect(screen.getByText('Back to production')).toBeDefined()
  })
})
