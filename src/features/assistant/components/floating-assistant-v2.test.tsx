import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
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
              role: 'user' as const,
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
    emptyTitle: 'Ask about your workspace',
    emptyDescription: 'Try a question.',
    loadingHistory: 'Loading conversation...',
    messagePlaceholder: 'Ask a business question...',
    send: 'Send',
    responding: 'Responding...',
    historyError: 'Failed to load conversation history.',
    retry: 'Retry',
    loadEarlier: 'Load earlier messages',
    loadingEarlier: 'Loading earlier messages...',
    keyboardHint: 'Press Enter to send, Shift+Enter for new line',
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

  it('renders text deltas before the stream finishes', async () => {
    const user = userEvent.setup()
    let releaseFinal: (() => void) | undefined
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const encoder = new TextEncoder()
        const write = (chunk: Record<string, unknown>) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`),
          )
        }

        write({ type: 'start', messageId: 'assistant-1' })
        write({ type: 'text-start', id: 'text-1' })
        write({ type: 'text-delta', id: 'text-1', delta: 'Hello' })
        await new Promise<void>((resolve) => {
          releaseFinal = resolve
        })
        write({ type: 'text-delta', id: 'text-1', delta: ' world' })
        write({ type: 'text-end', id: 'text-1' })
        write({ type: 'finish', finishReason: 'stop' })
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
    const composer = screen.getByRole('textbox')
    await user.type(composer, 'Hello{enter}')

    await waitFor(() => expect(screen.getByText('Hello')).toBeInTheDocument())
    expect(screen.queryByText('Hello world')).not.toBeInTheDocument()

    releaseFinal?.()
    expect(await screen.findByText('Hello world')).toBeInTheDocument()
  })
})
