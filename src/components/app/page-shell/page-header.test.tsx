import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { PageHeader } from './page-header'

async function renderWithRouter(component: React.ReactNode) {
  const rootRoute = createRootRoute({ component: () => component })
  const router = createRouter({
    routeTree: rootRoute,
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })
  await router.load()

  return render(<RouterProvider router={router} />)
}

describe('PageHeader', () => {
  it('renders the title', () => {
    render(<PageHeader title="Orders" />)
    expect(screen.getByText('Orders')).toBeDefined()
  })

  it('renders an optional description', () => {
    render(<PageHeader title="Orders" description="Manage your orders" />)
    expect(screen.getByText('Manage your orders')).toBeDefined()
  })

  it('renders primary action when provided with onClick', () => {
    render(
      <PageHeader
        title="Orders"
        primaryAction={{ label: 'New Order', onClick: () => {} }}
      />,
    )
    expect(screen.getByText('New Order')).toBeDefined()
  })

  it('does not render a back button by default', () => {
    render(<PageHeader title="Orders" />)
    expect(screen.queryByRole('button', { name: 'Back' })).toBeNull()
  })

  it('renders an accessible back link when provided with href', async () => {
    await renderWithRouter(
      <PageHeader title="Orders" backAction={{ label: 'Back', href: '/' }} />,
    )
    expect(screen.getByRole('link', { name: 'Back' })).toBeDefined()
  })

  it('renders an accessible back button when provided with onClick', async () => {
    const user = userEvent.setup()
    let clicked = false
    render(
      <PageHeader
        title="Orders"
        backAction={{
          label: 'Back',
          onClick: () => {
            clicked = true
          },
        }}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Back' }))
    expect(clicked).toBe(true)
  })

  it('hides on mobile with hidden md:flex classes', () => {
    const { container } = render(<PageHeader title="Orders" />)
    const root = container.firstChild as HTMLElement
    expect(root.className).toContain('hidden')
    expect(root.className).toContain('md:flex')
  })
})
