import { useCallback, useRef, useState } from 'react'
import type { AssistantChatScope } from '#/features/assistant/hooks'
import type {
  AssistantChatMessage,
  AssistantChatMessageMetadata,
  AssistantStreamToolCall,
} from '#/features/assistant/model'

export type { AssistantStreamToolCall }

export type AssistantStreamTurn = {
  assistantId: string
  clientMessageId: string
  text: string
  toolCalls: AssistantStreamToolCall[]
  metadata: AssistantChatMessageMetadata | null
  status: 'streaming' | 'finished' | 'error'
  errorMessage: string | null
}

export type AssistantStreamCallbacks = {
  onUserMessage?: (message: AssistantChatMessage) => void
  onAssistantTurn: (turn: AssistantStreamTurn) => void
  onComplete?: (assistantMessage: AssistantChatMessage) => void
  onError?: (assistantId: string, errorMessage: string) => void
}

type StreamEvent =
  | {
      type: 'ready'
      assistantMessageId: string
      clientMessageId: string | null
    }
  | { type: 'text-delta'; delta: string }
  | {
      type: 'tool-call'
      toolCallId: string
      toolName: string
      args: Record<string, unknown> | null
    }
  | {
      type: 'tool-result'
      toolCallId: string
      toolName: string
      isError: boolean
      summary: string
    }
  | {
      type: 'metadata'
      clientMessageId: string | null
      metadata: AssistantChatMessageMetadata
    }
  | { type: 'finish'; clientMessageId: string | null }
  | { type: 'error'; message: string }
const STREAM_PATH = '/api/assistant/stream'

function createTurn(
  clientMessageId: string,
  assistantId: string,
): AssistantStreamTurn {
  return {
    assistantId,
    clientMessageId,
    text: '',
    toolCalls: [],
    metadata: null,
    status: 'streaming',
    errorMessage: null,
  }
}

export function useStreamAssistantMessage(_scope: AssistantChatScope) {
  const [isStreaming, setIsStreaming] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const cancel = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setIsStreaming(false)
  }, [])

  const stream = useCallback(
    async (
      message: string,
      clientMessageId: string,
      callbacks: AssistantStreamCallbacks,
    ): Promise<void> => {
      const trimmed = message.trim()
      if (trimmed.length === 0 || trimmed.length > 2000) return

      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      setIsStreaming(true)

      const userMessage: AssistantChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: trimmed,
        createdAt: new Date().toISOString(),
        clientMessageId,
      }
      callbacks.onUserMessage?.(userMessage)

      let turn = createTurn(clientMessageId, crypto.randomUUID())

      const pushTurn = (next: AssistantStreamTurn): void => {
        turn = next
        callbacks.onAssistantTurn(next)
      }

      try {
        const response = await fetch(STREAM_PATH, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            message: trimmed,
            clientMessageId,
          }),
          signal: controller.signal,
        })

        if (!response.ok || !response.body) {
          throw new Error(
            response.status === 401
              ? 'Not authenticated'
              : response.status === 403
                ? 'Not authorized'
                : `Stream failed (${response.status})`,
          )
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        let pendingFinish = false

        const handleEvent = (event: StreamEvent): void => {
          switch (event.type) {
            case 'ready': {
              const next: AssistantStreamTurn = {
                ...turn,
                assistantId: event.assistantMessageId,
              }
              pushTurn(next)
              break
            }
            case 'text-delta': {
              const next: AssistantStreamTurn = {
                ...turn,
                text: turn.text + event.delta,
              }
              pushTurn(next)
              break
            }
            case 'tool-call': {
              const existing = turn.toolCalls.find(
                (entry) => entry.toolCallId === event.toolCallId,
              )
              const toolCalls = existing
                ? turn.toolCalls.map((entry) =>
                    entry.toolCallId === event.toolCallId
                      ? {
                          ...entry,
                          toolName: event.toolName,
                          args: event.args,
                          status: 'running' as const,
                        }
                      : entry,
                  )
                : [
                    ...turn.toolCalls,
                    {
                      toolCallId: event.toolCallId,
                      toolName: event.toolName,
                      status: 'running' as const,
                      args: event.args,
                      summary: null,
                    },
                  ]
              pushTurn({ ...turn, toolCalls })
              break
            }
            case 'tool-result': {
              const toolCalls = turn.toolCalls.map((entry) =>
                entry.toolCallId === event.toolCallId
                  ? {
                      ...entry,
                      toolName: event.toolName,
                      status: event.isError
                        ? ('error' as const)
                        : ('done' as const),
                      summary: event.summary,
                    }
                  : entry,
              )
              pushTurn({ ...turn, toolCalls })
              break
            }
            case 'metadata': {
              pushTurn({ ...turn, metadata: event.metadata })
              break
            }
            case 'finish': {
              pushTurn({
                ...turn,
                status: 'finished',
                errorMessage: null,
              })
              pendingFinish = true
              break
            }
            case 'error': {
              pushTurn({
                ...turn,
                status: 'error',
                errorMessage: event.message,
              })
              callbacks.onError?.(turn.assistantId, event.message)
              pendingFinish = true
              break
            }
          }
        }

        const pump = async (): Promise<void> => {
          while (true) {
            const { value, done } = await reader.read()
            if (done) break
            if (value) {
              buffer += decoder.decode(value, { stream: true })
              let separatorIndex = buffer.indexOf('\n\n')
              while (separatorIndex !== -1) {
                const rawFrame = buffer.slice(0, separatorIndex)
                buffer = buffer.slice(separatorIndex + 2)
                const line = rawFrame
                  .split('\n')
                  .find((part) => part.startsWith('data:'))
                if (line) {
                  const payload = line.slice('data:'.length).trim()
                  if (payload.length > 0) {
                    try {
                      handleEvent(JSON.parse(payload) as StreamEvent)
                    } catch {
                      // Ignore malformed frames; keep draining.
                    }
                  }
                }
                separatorIndex = buffer.indexOf('\n\n')
              }
            }
          }
        }

        await pump()

        if (!pendingFinish) {
          pushTurn({ ...turn, status: 'finished', errorMessage: null })
        }

        const assistantMessage: AssistantChatMessage = {
          id: turn.assistantId,
          role: 'assistant',
          content: turn.text,
          createdAt: new Date().toISOString(),
          clientMessageId,
          metadata: turn.metadata ?? undefined,
          toolCalls: turn.toolCalls,
        }
        callbacks.onComplete?.(assistantMessage)
      } catch (err: unknown) {
        if (controller.signal.aborted) {
          return
        }
        const errorMessage =
          err instanceof Error ? err.message : 'Unknown error'
        const failed: AssistantStreamTurn = {
          ...turn,
          status: 'error',
          errorMessage,
        }
        callbacks.onAssistantTurn(failed)
        callbacks.onError?.(turn.assistantId, errorMessage)
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null
        }
        setIsStreaming(false)
      }
    },
    [],
  )

  return { stream, cancel, isStreaming }
}
