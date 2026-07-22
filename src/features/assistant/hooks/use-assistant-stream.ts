import { useCallback, useRef, useState } from 'react'

// --- Types ---

export type StreamMessage = {
  id: string
  role: 'user' | 'assistant'
  text: string
  reasoning?: string
  toolCalls: Array<{
    toolCallId: string
    toolName: string
    status: 'running' | 'complete' | 'error'
    summary?: string
  }>
  isRunning: boolean
  error?: string | null
  createdAt?: string
}

type StreamEvent =
  | {
      type: 'ready'
      assistantMessageId: string
      clientMessageId: string | null
    }
  | { type: 'text-delta'; delta: string }
  | { type: 'reasoning-delta'; delta: string }
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
  | { type: 'finish'; clientMessageId: string | null }
  | { type: 'error'; message: string }

function setMsg(
  state: StreamMessage[],
  id: string,
  upd: (m: StreamMessage) => StreamMessage,
): StreamMessage[] {
  let idx = state.findIndex((m) => m.id === id)
  if (idx === -1) {
    // Fallback 1: match active running assistant message
    idx = state.findIndex((m) => m.role === 'assistant' && m.isRunning)
  }
  if (idx === -1) {
    // Fallback 2: match last assistant message
    for (let i = state.length - 1; i >= 0; i--) {
      if (state[i].role === 'assistant') {
        idx = i
        break
      }
    }
  }
  if (idx === -1) return state
  const copy = state.slice()
  copy[idx] = upd(copy[idx])
  return copy
}

export function useAssistantStream(initialMessages: StreamMessage[] = []) {
  const [messages, setMessages] = useState<StreamMessage[]>(initialMessages)
  const [isRunning, setIsRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const messagesRef = useRef(messages)
  messagesRef.current = messages

  // Sync when initialMessages updates from history query without losing pending/active local turns
  const prevLenRef = useRef(initialMessages.length)
  if (initialMessages.length > prevLenRef.current) {
    prevLenRef.current = initialMessages.length
    const initialIds = new Set(initialMessages.map((m) => m.id))
    const initialUserTexts = new Set(
      initialMessages
        .filter((m) => m.role === 'user')
        .map((m) => m.text.trim()),
    )
    setMessages((curr) => {
      const pendingLocal = curr.filter((m) => {
        if (initialIds.has(m.id)) return false
        if (m.role === 'user' && initialUserTexts.has(m.text.trim()))
          return false
        return (
          m.isRunning ||
          m.role === 'assistant' ||
          m.role === 'user' ||
          Boolean(m.error)
        )
      })
      if (pendingLocal.length === 0) return initialMessages
      return [...initialMessages, ...pendingLocal]
    })
  }

  const assistantRef = useRef<{
    id: string
    text: string
    reasoning?: string
    toolCalls: StreamMessage['toolCalls']
  } | null>(null)

  const sendMessage = useCallback(
    async (text: string) => {
      const current = messagesRef.current

      const userMsg: StreamMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        text,
        toolCalls: [],
        isRunning: false,
      }

      const assistantMsg: StreamMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        text: '',
        reasoning: '',
        toolCalls: [],
        isRunning: true,
      }

      const allToSend = [...current, userMsg, assistantMsg]

      setMessages(allToSend)
      setIsRunning(true)
      setError(null)

      const aRef = {
        id: assistantMsg.id,
        text: '',
        reasoning: '',
        toolCalls: [] as StreamMessage['toolCalls'],
      }
      assistantRef.current = aRef

      const abortController = new AbortController()
      abortRef.current = abortController

      try {
        console.log(
          '[assistant-stream-client] Sending POST request to /api/assistant/stream',
          {
            messageLength: text.length,
            clientMessageId: userMsg.id,
          },
        )
        const res = await fetch('/api/assistant/stream', {
          method: 'POST',
          headers: {
            Accept: 'text/event-stream',
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          cache: 'no-store',
          body: JSON.stringify({
            message: text,
            clientMessageId: userMsg.id,
          }),
          signal: abortController.signal,
        })
        console.log('[assistant-stream-client] Received HTTP response', {
          status: res.status,
          statusText: res.statusText,
          contentType: res.headers.get('content-type'),
        })
        if (!res.ok) {
          let errorMsg = 'An error occurred. Please try again.'
          if (res.status === 429) {
            errorMsg = 'Rate limit reached. Please try again in a moment.'
          } else {
            try {
              const text = await res.text()
              if (text) errorMsg = text
            } catch {
              // fallback message
            }
          }
          console.error('[assistant-stream-client] Response not OK', {
            status: res.status,
            errorMsg,
          })
          setError(errorMsg)
          setMessages((prev) =>
            setMsg(prev, aRef.id, (m) => ({
              ...m,
              error: errorMsg,
              isRunning: false,
            })),
          )
          return
        }
        if (!res.body) {
          throw new Error('Response body is empty')
        }
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buf = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) {
            console.log('[assistant-stream-client] Reader stream done')
            break
          }
          if (value) {
            console.log('[assistant-stream-client] Stream chunk read', {
              byteLength: value.byteLength,
            })
            buf += decoder.decode(value, { stream: true })
            buf = buf.replace(/\r\n?/g, '\n')
            let sep = buf.indexOf('\n\n')
            while (sep !== -1) {
              const rawFrame = buf.slice(0, sep)
              buf = buf.slice(sep + 2)

              const line = rawFrame
                .split('\n')
                .find((l) => l.startsWith('data:'))
              if (line) {
                const payload = line.slice(5).trim()
                if (payload && payload !== '[DONE]') {
                  let event: StreamEvent
                  try {
                    event = JSON.parse(payload) as StreamEvent
                  } catch (parseErr) {
                    console.error(
                      '[assistant-stream-client] JSON parse error for payload:',
                      payload,
                      parseErr,
                    )
                    continue
                  }

                  console.log(
                    '[assistant-stream-client] Event received:',
                    event.type,
                    event,
                  )

                  switch (event.type) {
                    case 'ready': {
                      const oldId = aRef.id
                      aRef.id = event.assistantMessageId
                      console.log(
                        '[assistant-stream-client] Ready event set assistant ID:',
                        event.assistantMessageId,
                      )
                      setMessages((prev) =>
                        setMsg(prev, oldId, (m) => ({
                          ...m,
                          id: event.assistantMessageId,
                        })),
                      )
                      break
                    }

                    case 'text-delta':
                      aRef.text += event.delta
                      setMessages((prev) =>
                        setMsg(prev, aRef.id, (m) => ({
                          ...m,
                          text: aRef.text,
                        })),
                      )
                      break

                    case 'reasoning-delta':
                      aRef.reasoning = (aRef.reasoning || '') + event.delta
                      setMessages((prev) =>
                        setMsg(prev, aRef.id, (m) => ({
                          ...m,
                          reasoning: aRef.reasoning,
                        })),
                      )
                      break
                    case 'tool-call': {
                      const tn = event.toolName
                      if (tn) {
                        aRef.toolCalls = [
                          ...aRef.toolCalls,
                          {
                            toolCallId: event.toolCallId,
                            toolName: tn,
                            status: 'running' as const,
                          },
                        ]
                        setMessages((prev) =>
                          setMsg(prev, aRef.id, (m) => ({
                            ...m,
                            toolCalls: [...aRef.toolCalls],
                          })),
                        )
                      }
                      break
                    }

                    case 'tool-result': {
                      const ti = aRef.toolCalls.findIndex(
                        (t) => t.toolCallId === event.toolCallId,
                      )
                      if (ti !== -1) {
                        aRef.toolCalls = aRef.toolCalls.map((t, i) =>
                          i === ti
                            ? {
                                ...t,
                                status: event.isError
                                  ? ('error' as const)
                                  : ('complete' as const),
                                summary: event.summary,
                              }
                            : t,
                        )
                        setMessages((prev) =>
                          setMsg(prev, aRef.id, (m) => ({
                            ...m,
                            toolCalls: [...aRef.toolCalls],
                          })),
                        )
                      }
                      break
                    }
                    case 'error':
                      console.error('[chat-stream] error event:', event.message)
                      setError(event.message)
                      setMessages((prev) =>
                        setMsg(prev, aRef.id, (m) => ({
                          ...m,
                          error: event.message,
                          isRunning: false,
                        })),
                      )
                      break
                    case 'finish':
                      setIsRunning(false)
                      setMessages((prev) =>
                        setMsg(prev, aRef.id, (m) => ({
                          ...m,
                          isRunning: false,
                        })),
                      )
                      break
                  }
                }
              }
              sep = buf.indexOf('\n\n')
            }
          }
        }
        buf += decoder.decode()
        buf = buf.replace(/\r\n?/g, '\n')
        if (buf.trim().length > 0) {
          const line = buf.split('\n').find((l) => l.startsWith('data:'))
          if (line) {
            const payload = line.slice(5).trim()
            if (payload && payload !== '[DONE]') {
              try {
                const event = JSON.parse(payload) as StreamEvent
                if (event.type === 'text-delta') {
                  aRef.text += event.delta
                  setMessages((prev) =>
                    setMsg(prev, aRef.id, (m) => ({ ...m, text: aRef.text })),
                  )
                } else if (event.type === 'reasoning-delta') {
                  aRef.reasoning = (aRef.reasoning || '') + event.delta
                  setMessages((prev) =>
                    setMsg(prev, aRef.id, (m) => ({
                      ...m,
                      reasoning: aRef.reasoning,
                    })),
                  )
                }
              } catch {
                // ignore
              }
            }
          }
        }
      } catch (err: unknown) {
        if (abortController.signal.aborted) {
          return
        }
        const msg = err instanceof Error ? err.message : 'Unknown error'
        console.error('[chat-stream] error:', msg)
        setError(msg)
        if (aRef.id) {
          setMessages((prev) =>
            setMsg(prev, aRef.id, (m) => ({
              ...m,
              error: msg,
              isRunning: false,
            })),
          )
        }
      } finally {
        setIsRunning(false)
        if (aRef.id) {
          setMessages((prev) =>
            setMsg(prev, aRef.id, (m) => ({ ...m, isRunning: false })),
          )
        }
        assistantRef.current = null
        abortRef.current = null
      }
    },
    [], // stable — reads current messages from ref
  )
  const retryMessage = useCallback(
    (targetAssistantId?: string) => {
      const current = messagesRef.current
      let assistantIndex = -1

      if (targetAssistantId) {
        assistantIndex = current.findIndex((m) => m.id === targetAssistantId)
      } else {
        for (let i = current.length - 1; i >= 0; i--) {
          if (current[i].role === 'assistant' && current[i].error) {
            assistantIndex = i
            break
          }
        }
      }

      if (assistantIndex === -1) return

      let userIndex = -1
      for (let i = assistantIndex - 1; i >= 0; i--) {
        if (current[i].role === 'user') {
          userIndex = i
          break
        }
      }

      if (userIndex === -1) return
      const promptToRetry = current[userIndex].text

      const baseMessages = current.slice(0, userIndex)
      messagesRef.current = baseMessages
      setMessages(baseMessages)

      sendMessage(promptToRetry)
    },
    [sendMessage],
  )

  const stop = useCallback(() => {
    abortRef.current?.abort()
    setIsRunning(false)
    const a = assistantRef.current
    if (a) {
      setMessages((prev) =>
        setMsg(prev, a.id, (m) => ({ ...m, isRunning: false })),
      )
      assistantRef.current = null
    }
  }, [])

  return { messages, isRunning, error, sendMessage, retryMessage, stop }
}
