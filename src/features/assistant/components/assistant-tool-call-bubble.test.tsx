import { render, screen } from '@testing-library/react'
import { IntlProvider } from 'use-intl'
import { describe, expect, it } from 'vitest'
import AssistantToolCallBubble from './assistant-tool-call-bubble'

const messages = {
  assistant: {
    toolCall: {
      generic: 'Calling {name}',
      search: 'Searching records',
      overview: 'Loading workspace overview',
      propose: 'Drafting an order',
      resolve: 'Resolving draft items',
      confirm: 'Creating the draft order',
    },
  },
}

function renderWithIntl(ui: React.ReactNode) {
  return render(
    <IntlProvider locale="en" messages={messages} timeZone="UTC">
      {ui}
    </IntlProvider>,
  )
}

describe('AssistantToolCallBubble', () => {
  it('shows the localised label for the proposeOrderDraft tool', () => {
    renderWithIntl(
      <AssistantToolCallBubble
        call={{
          toolCallId: 'tc-1',
          toolName: 'proposeOrderDraft',
          status: 'running',
          summary: null,
        }}
      />,
    )
    expect(screen.getByText('Drafting an order')).toBeInTheDocument()
  })

  it('renders a summary line once the tool has a result', () => {
    renderWithIntl(
      <AssistantToolCallBubble
        call={{
          toolCallId: 'tc-1',
          toolName: 'businessSearch',
          status: 'done',
          summary: '3 records',
        }}
      />
    )
    expect(screen.getByText('Searching records')).toBeInTheDocument()
    expect(screen.getByText('3 records')).toBeInTheDocument()
  })

  it('falls back to the generic label with the tool name for unknown tools', () => {
    renderWithIntl(
      <AssistantToolCallBubble
        call={{
          toolCallId: 'tc-1',
          toolName: 'customTool',
          status: 'running',
          summary: null,
        }}
      />
    )
    expect(screen.getByText('Calling customTool')).toBeInTheDocument()
  })
})
