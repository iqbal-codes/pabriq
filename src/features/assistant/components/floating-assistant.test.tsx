import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { IntlProvider } from 'use-intl'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AssistantChatMessage } from '#/features/assistant/model'
import { FloatingAssistant } from './floating-assistant'

const serverMocks = vi.hoisted(() => ({
  send: vi.fn(),
}))

const streamMocks = vi.hoisted(() => ({
  fetchStream: vi.fn(),
}))

class MockReadableStream {
  chunks: Uint8Array[]
  constructor(chunks: Uint8Array[]) {
    this.chunks = chunks
  }
  getReader() {
    const chunks = this.chunks
    let index = 0
    return {
      read: async () => {
        const value = chunks[index++]
        if (value === undefined) {
          return { value: undefined, done: true }
        }
        return { value, done: false }
      },
      releaseLock: () => undefined,
    }
  }
}

function buildSseBody(events: Array<Record<string, unknown>>): Uint8Array {
  const payload = events
    .map((event) => `data: ${JSON.stringify(event)}\n\n`)
    .join('')
  return new TextEncoder().encode(payload)
}

vi.mock('#/features/assistant/server', () => ({
  loadAssistantChatFn: vi.fn().mockResolvedValue({
    ok: true,
    messages: [],
    page: 0,
    hasMore: false,
  }),
  sendAssistantMessageFn: serverMocks.send,
  cancelOrderDraftProposalFn: vi.fn(),
  consumeOrderDraftProposalFn: vi.fn(),
  getProposalFn: vi.fn(),
}))

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
    responding: 'Responding...',
    historyError: 'Failed to load conversation history.',
    retry: 'Retry',
    jumpToLatest: 'Jump to latest',
    loadEarlier: 'Load earlier messages',
    loadingEarlier: 'Loading earlier messages...',
    keyboardHint: 'Press Enter to send, Shift+Enter for new line',
    today: 'Today',
    yesterday: 'Yesterday',
    starterOrderDraft: 'Draft a new order',
    starterPendingWork: 'What work needs attention?',
    starterPriorities: 'What are our top priorities?',
    you: 'You',
    assistant: 'Assistant',
    notConfigured: 'AI assistant is not configured.',
    genericError: 'The assistant could not answer. Try again.',
    streaming: 'Streaming response',
    toolCall: {
      generic: 'Calling {name}',
      search: 'Searching records',
      overview: 'Loading workspace overview',
      propose: 'Drafting an order',
      resolve: 'Resolving draft items',
      confirm: 'Creating the draft order',
    },
    proposal: {
      title: 'Draft proposal',
      subtotal: 'Subtotal',
      total: 'Total',
      customer: 'Customer',
      expiresIn: '{minutes} min remaining',
      proceed: 'Proceed — create draft',
      cancel: 'Cancel',
      cancelled: 'Draft proposal cancelled.',
      expired:
        'This proposal is no longer valid. Ask the assistant for a fresh one.',
    },
    error: {
      tryAgain: 'Try again by asking the assistant for a fresh proposal.',
    },
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
  beforeEach(() => {
    serverMocks.send.mockReset()
    serverMocks.send.mockResolvedValue({
      ok: true,
      message: {
        id: 'assistant-1',
        role: 'assistant',
        content: 'Done',
        createdAt: '2026-07-20T10:01:00.000Z',
      } satisfies AssistantChatMessage,
    })
    streamMocks.fetchStream.mockReset()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function stubStreamingFetch(events: Array<Record<string, unknown>>) {
    const body = buildSseBody(events)
    streamMocks.fetchStream.mockResolvedValue({
      ok: true,
      status: 200,
      body: new MockReadableStream([body]),
    })
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        if (typeof input === 'string' && input === '/api/assistant/stream') {
          return streamMocks.fetchStream()
        }
        throw new Error(`Unexpected fetch: ${String(input)}`)
      }),
    )
  }

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

  it('shows practical starter prompts when the conversation is empty', async () => {
    const user = userEvent.setup()
    renderWithProviders(<FloatingAssistant orgId="org-1" userId="user-1" />)

    await user.click(screen.getByRole('button', { name: 'Open assistant' }))

    expect(
      await screen.findByText('Ask about your workspace'),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Draft a new order' }),
    ).toBeInTheDocument()
  })

  it('shows an accessible message composer', async () => {
    const user = userEvent.setup()
    renderWithProviders(<FloatingAssistant orgId="org-1" userId="user-1" />)

    await user.click(screen.getByRole('button', { name: 'Open assistant' }))

    expect(screen.getByRole('textbox', { name: 'Message' })).toBeInTheDocument()
  })

  it('sends with Enter and streams the assistant response back live', async () => {
    const user = userEvent.setup()
    stubStreamingFetch([
      {
        type: 'ready',
        assistantMessageId: 'assistant-1',
        clientMessageId: '',
      },
      { type: 'text-delta', delta: 'Hello there' },
      { type: 'finish', clientMessageId: '' },
    ])
    renderWithProviders(<FloatingAssistant orgId="org-1" userId="user-1" />)
    await user.click(screen.getByRole('button', { name: 'Open assistant' }))
    const composer = screen.getByRole('textbox', { name: 'Message' })

    await user.type(composer, 'First line{shift>}{enter}{/shift}Second line')
    expect(streamMocks.fetchStream).not.toHaveBeenCalled()
    expect(composer).toHaveValue('First line\nSecond line')

    await user.type(composer, '{enter}')
    await waitFor(() =>
      expect(streamMocks.fetchStream).toHaveBeenCalledTimes(1),
    )
    expect(await screen.findByText('Hello there')).toBeInTheDocument()
  })

  it('sends the client message id with the stream request so the persisted assistant message gets reconciled without duplicates', async () => {
    const user = userEvent.setup()
    stubStreamingFetch([
      {
        type: 'ready',
        assistantMessageId: 'assistant-1',
        clientMessageId: '',
      },
      { type: 'text-delta', delta: 'Reconciled' },
      { type: 'finish', clientMessageId: '' },
    ])
    renderWithProviders(<FloatingAssistant orgId="org-1" userId="user-1" />)
    await user.click(screen.getByRole('button', { name: 'Open assistant' }))
    const composer = screen.getByRole('textbox', { name: 'Message' })
    await user.type(composer, 'hello{enter}')
    await waitFor(() =>
      expect(streamMocks.fetchStream).toHaveBeenCalledTimes(1),
    )
    const callArgs = streamMocks.fetchStream.mock.calls[0]
    expect(callArgs).toBeDefined()
    const fetchMock = vi.mocked(fetch)
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined
    expect(init?.method).toBe('POST')
    const payload = JSON.parse(String(init?.body)) as {
      message: string
      clientMessageId: string
    }
    expect(payload.message).toBe('hello')
    expect(typeof payload.clientMessageId).toBe('string')
    expect(payload.clientMessageId.length).toBeGreaterThan(0)
  })

  it('clears the composer once the stream completes so the next prompt starts fresh', async () => {
    const user = userEvent.setup()
    stubStreamingFetch([
      {
        type: 'ready',
        assistantMessageId: 'assistant-1',
        clientMessageId: '',
      },
      { type: 'text-delta', delta: 'done' },
      { type: 'finish', clientMessageId: '' },
    ])
    renderWithProviders(<FloatingAssistant orgId="org-1" userId="user-1" />)
    await user.click(screen.getByRole('button', { name: 'Open assistant' }))
    const composer = screen.getByRole('textbox', { name: 'Message' })
    await user.type(composer, 'hello{enter}')
    await waitFor(() =>
      expect(streamMocks.fetchStream).toHaveBeenCalledTimes(1),
    )
    await waitFor(() => expect(composer).toHaveValue(''))
  })

  it('keeps the tool-call bubble visible after the stream completes, then drops the duplicate once history lands', async () => {
    const user = userEvent.setup()
    stubStreamingFetch([
      {
        type: 'ready',
        assistantMessageId: 'assistant-1',
        clientMessageId: '',
      },
      {
        type: 'tool-call',
        toolCallId: 'tc-1',
        toolName: 'proposeOrderDraft',
        args: null,
      },
      { type: 'text-delta', delta: 'Order created.' },
      {
        type: 'tool-result',
        toolCallId: 'tc-1',
        toolName: 'proposeOrderDraft',
        isError: false,
        summary: 'Drafted',
      },
      { type: 'finish', clientMessageId: '' },
    ])
    renderWithProviders(<FloatingAssistant orgId="org-1" userId="user-1" />)
    await user.click(screen.getByRole('button', { name: 'Open assistant' }))
    const composer = screen.getByRole('textbox', { name: 'Message' })
    await user.type(composer, 'order please{enter}')
    await waitFor(() =>
      expect(streamMocks.fetchStream).toHaveBeenCalledTimes(1),
    )
    // Tool-call bubble + assistant text bubble must both be visible after
    // the stream completes: the hook copies the live tool calls onto the
    // completedTurns entry so the tool-call trail survives completion.
    expect(await screen.findByText('Drafting an order')).toBeInTheDocument()
    expect(await screen.findByText('Order created.')).toBeInTheDocument()
    // The user prompt must also be visible exactly once (no duplicate
    // user bubble from the live entry).
    expect(
      screen.getAllByText('order please', { exact: true }).length,
    ).toBeGreaterThanOrEqual(1)
  })
})
