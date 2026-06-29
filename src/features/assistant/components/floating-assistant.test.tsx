import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { IntlProvider } from 'use-intl'
import { describe, expect, it } from 'vitest'
import { FloatingAssistant } from './floating-assistant'

const messages = {
  assistant: {
    trigger: 'Open assistant',
    title: 'Pabriq Assistant',
    description:
      'Ask about orders, customers, products, invoices, or production tasks you can access.',
    emptyTitle: 'Ask about your workspace',
    emptyDescription: 'Try "Which orders are still open?" or "Find Acme".',
    loadingHistory: 'Loading conversation...',
    messageLabel: 'Message',
    messagePlaceholder: 'Ask a business question...',
    send: 'Send',
    sending: 'Sending...',
    you: 'You',
    assistant: 'Assistant',
    notConfigured: 'AI assistant is not configured.',
    genericError: 'The assistant could not answer. Try again.',
  },
}

function renderWithProviders(ui: React.ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(
    <IntlProvider locale="en" messages={messages} timeZone="UTC">
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    </IntlProvider>,
  )
}

describe('FloatingAssistant', () => {
  it('renders trigger button with accessible label', () => {
    renderWithProviders(<FloatingAssistant orgId="org-1" userId="user-1" />)

    const trigger = screen.getByRole('button', { name: 'Open assistant' })
    expect(trigger).toBeInTheDocument()
  })

  it('opens sheet with title and description on trigger click', async () => {
    const user = userEvent.setup()
    renderWithProviders(<FloatingAssistant orgId="org-1" userId="user-1" />)

    const trigger = screen.getByRole('button', { name: 'Open assistant' })
    await user.click(trigger)

    expect(screen.getByText('Pabriq Assistant')).toBeInTheDocument()
    expect(screen.getByText(/Ask about orders/)).toBeInTheDocument()
  })

  it('shows empty state when no messages', async () => {
    const user = userEvent.setup()
    renderWithProviders(<FloatingAssistant orgId="org-1" userId="user-1" />)

    const trigger = screen.getByRole('button', { name: 'Open assistant' })
    await user.click(trigger)

    // Should show loading or empty state
    expect(
      screen.getByText('Ask about your workspace') ||
        screen.getByText('Loading conversation...'),
    ).toBeInTheDocument()
  })

  it('shows message input field', async () => {
    const user = userEvent.setup()
    renderWithProviders(<FloatingAssistant orgId="org-1" userId="user-1" />)

    const trigger = screen.getByRole('button', { name: 'Open assistant' })
    await user.click(trigger)

    expect(screen.getByText('Message')).toBeInTheDocument()
  })
})
