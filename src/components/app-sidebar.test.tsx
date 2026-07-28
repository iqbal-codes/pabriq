import { render, screen } from '@testing-library/react'
import { IntlProvider } from 'use-intl'
import { describe, expect, it, vi } from 'vitest'
import { SidebarProvider } from '#/components/ui/sidebar'
import { AppSidebar } from './app-sidebar'

vi.mock('@tanstack/react-router', () => ({
  useLocation: () => ({ pathname: '/' }),
  useRouter: () => ({ navigate: vi.fn() }),
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}))

const testMessages = {
  admin: {
    logOut: 'Log out',
  },
  common: {
    back: 'Back',
  },
  sidebar: {
    dashboard: 'Dashboard',
    orders: 'Orders',
    customers: 'Customers',
    products: 'Products',
    production: 'Production',
    settings: 'Settings',
  },
  settings: {
    general: 'General',
    profile: 'Profile',
    members: 'Members',
    channels: 'Channels',
    paymentMethods: 'Payment Methods',
    invoicing: 'Invoicing',
  },
  production: {
    stageManagement: 'Production Stages',
  },
}

function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <IntlProvider locale="en" messages={testMessages}>
      <SidebarProvider>{children}</SidebarProvider>
    </IntlProvider>
  )
}

describe('AppSidebar', () => {
  it('renders standard navigation items and excludes invoices', () => {
    const appSidebarProps = {
      user: { name: 'John Doe', email: 'john@example.com', avatar: '' },
      org: { name: 'My Workshop', slug: 'my-workshop', logo: null },
      role: 'owner' as const,
    }

    render(
      <TestWrapper>
        <AppSidebar {...appSidebarProps} />
      </TestWrapper>,
    )

    // Check visible items
    expect(screen.getByText('Dashboard')).toBeDefined()
    expect(screen.getByText('Orders')).toBeDefined()
    expect(screen.getByText('Customers')).toBeDefined()
    expect(screen.getByText('Products')).toBeDefined()
    expect(screen.getByText('Production')).toBeDefined()
    expect(screen.getByText('Settings')).toBeDefined()

    // Invoices should not be present
    expect(screen.queryByText('Invoices')).toBeNull()
  })
})
