import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { IntlProvider } from 'use-intl'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FloatingAssistantV2 } from './floating-assistant-v2'

const assistantMocks = vi.hoisted(() => ({
  history: {
    data: {
      pages: [
        {
          ok: true,
          messages: [
            {
              id: 'history-1',
              role: 'user' as 'user' | 'assistant',
              content: 'Earlier question',
              createdAt: '2026-07-20T10:00:00.000Z',
            },
          ],
          page: 0,
          hasMore: false,
        },
      ],
    },
    isLoading: false,
    isError: false,
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: vi.fn(),
    refetch: vi.fn(),
  },
}))

vi.mock('#/features/assistant/hooks', () => ({
  useAssistantChatHistory: () => assistantMocks.history,
}))

const messages = {
  assistant: {
    trigger: 'Open assistant',
    title: 'Pabriq Assistant',
    description: 'Ask about your workspace.',
    attachment: 'Attachment',
    cancel: 'Cancel',
    copyMessage: 'Copy message',
    emptyTitle: 'Ask about your workspace',
    emptyDescription: 'Try a question.',
    editMessage: 'Edit message',
    loadingHistory: 'Loading conversation...',
    messageLabel: 'Message',
    messagePlaceholder: 'Ask a business question...',
    send: 'Send',
    responding: 'Responding...',
    thinking: 'Thinking...',
    reasoning: 'Reasoning',
    nextResponse: 'Next response',
    previousResponse: 'Previous response',
    regenerateResponse: 'Regenerate response',
    rateLimitError: 'Rate limit reached. Please try again in a moment.',
    historyError: 'Failed to load conversation history.',
    retry: 'Retry',
    jumpToLatest: 'Jump to latest',
    loadEarlier: 'Load earlier messages',
    loadingEarlier: 'Loading earlier messages...',
    keyboardHint: 'Press Enter to send, Shift+Enter for new line',
    starterOrderDraft: 'Draft a new order',
    starterPendingWork: 'What work needs attention?',
    starterPriorities: 'What are our top priorities?',
    save: 'Save',
    me: 'Me',
    assistant: 'Assistant',
    toolCall: {
      generic: 'Calling {name}',
      search: 'Searching records',
      overview: 'Loading workspace overview',
      propose: 'Drafting an order',
      resolve: 'Resolving draft items',
      confirm: 'Creating the draft order',
      running: 'Running',
      completed: 'Completed',
      failed: 'Failed',
      cancelled: 'Cancelled',
      actionRequired: 'Action required',
      details: 'View details',
      arguments: 'Arguments',
      result: 'Result',
    },
    error: { tryAgain: 'Try again.' },
  },
}

function renderAssistant() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(
    <IntlProvider locale="en" messages={messages} timeZone="UTC">
      <QueryClientProvider client={queryClient}>
        <FloatingAssistantV2 orgId="org-1" userId="user-1" />
      </QueryClientProvider>
    </IntlProvider>,
  )
}

describe('FloatingAssistantV2', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
    assistantMocks.history.fetchNextPage.mockReset()
    assistantMocks.history.refetch.mockReset()
  })

  it('sends POST to /api/assistant/chat and renders text stream', async () => {
    const user = userEvent.setup()
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const encoder = new TextEncoder()
        const write = (chunk: Record<string, unknown>) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`),
          )
        }

        write({ type: 'text-start', id: 'text-1' })
        write({ type: 'text-delta', id: 'text-1', delta: 'Hello world' })
        write({ type: 'text-end', id: 'text-1' })
        write({ type: 'finish' })
        controller.close()
      },
    })

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(stream, {
        headers: { 'content-type': 'text/event-stream' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    renderAssistant()
    await user.click(screen.getByRole('button', { name: 'Open assistant' }))
    const composer = screen.getByRole('textbox')
    await user.type(composer, 'Hello{enter}')

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/assistant/chat',
      expect.objectContaining({
        method: 'POST',
      }),
    )

    expect(await screen.findByText('Hello world')).toBeInTheDocument()
  })

  it('renders grouped reasoning and tool-call details', async () => {
    const user = userEvent.setup()
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const encoder = new TextEncoder()
        const write = (chunk: Record<string, unknown>) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`),
          )
        }

        write({ type: 'reasoning-start', id: 'r-1' })
        write({
          type: 'reasoning-delta',
          id: 'r-1',
          delta: 'Secret internal reasoning',
        })
        write({ type: 'reasoning-end', id: 'r-1' })
        write({
          type: 'tool-input-start',
          toolCallId: 'tool-1',
          toolName: 'businessSearch',
        })
        write({
          type: 'tool-input-available',
          toolCallId: 'tool-1',
          toolName: 'businessSearch',
          input: { query: 'Acme' },
        })
        write({
          type: 'tool-output-available',
          toolCallId: 'tool-1',
          output: { count: 3 },
        })
        write({ type: 'text-start', id: 'text-1' })
        write({ type: 'text-delta', id: 'text-1', delta: 'Clean answer only' })
        write({ type: 'text-end', id: 'text-1' })
        write({ type: 'finish' })
        controller.close()
      },
    })

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(stream, {
          headers: { 'content-type': 'text/event-stream' },
        }),
      ),
    )

    renderAssistant()
    await user.click(screen.getByRole('button', { name: 'Open assistant' }))
    await user.type(screen.getByRole('textbox'), 'Show reasoning{enter}')

    expect(await screen.findByText('Clean answer only')).toBeInTheDocument()
    const reasoningToggle = screen.getByRole('button', { name: 'Reasoning' })
    await user.click(reasoningToggle)

    expect(screen.getByText('Secret internal reasoning')).toBeInTheDocument()
    expect(screen.getByText('Searching records')).toBeInTheDocument()
    expect(screen.getByText('Completed')).toBeInTheDocument()
    await user.click(screen.getByText('View details'))
    expect(screen.getByText(/"count": 3/)).toBeInTheDocument()
  })

  it('filters out om-status internal data parts from UI', async () => {
    const user = userEvent.setup()
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const encoder = new TextEncoder()
        const write = (chunk: Record<string, unknown>) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`),
          )
        }

        write({
          type: 'custom',
          kind: 'om-status',
          data: { windows: { active: { messages: { tokens: 4577 } } } },
        })
        write({ type: 'text-start', id: 'text-1' })
        write({ type: 'text-delta', id: 'text-1', delta: 'User response' })
        write({ type: 'text-end', id: 'text-1' })
        write({ type: 'finish' })
        controller.close()
      },
    })

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(stream, {
          headers: { 'content-type': 'text/event-stream' },
        }),
      ),
    )

    renderAssistant()
    await user.click(screen.getByRole('button', { name: 'Open assistant' }))
    await user.type(screen.getByRole('textbox'), 'Hello{enter}')

    expect(await screen.findByText('User response')).toBeInTheDocument()
    expect(screen.queryByText('om-status')).not.toBeInTheDocument()
  })
  it('renders history messages', async () => {
    renderAssistant()
    await userEvent.click(
      screen.getByRole('button', { name: 'Open assistant' }),
    )
    expect(screen.getByText('Earlier question')).toBeInTheDocument()
  })
})
