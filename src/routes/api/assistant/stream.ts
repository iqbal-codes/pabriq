import { RequestContext } from '@mastra/core/request-context'
import { createFileRoute } from '@tanstack/react-router'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { canUseAssistant } from '#/features/permissions/model'
import { auth } from '#/lib/auth'
import { resolveOrgAndRole } from '#/lib/auth-session-server'
import { logger } from '#/lib/logger'

type AssistantChatMessageMetadata =
  | {
      kind: 'order_draft_proposal'
      actionId: string
      expiresAt: string
    }
  | { kind: 'order_draft_cancelled'; actionId: string }
  | { kind: 'order_draft_error'; actionId: string; reason: string }

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
  | {
      type: 'metadata'
      clientMessageId: string | null
      metadata: AssistantChatMessageMetadata
    }
  | { type: 'finish'; clientMessageId: string | null }
  | { type: 'error'; message: string }

function sseEncode(event: StreamEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`
}
const SSE_FLUSH_PREAMBLE = `${':'.padEnd(4096, ' ')}\n\n`

function summariseToolResult(toolName: string, result: unknown): string {
  if (result == null) return ''
  if (typeof result === 'string') {
    const trimmed = result.trim()
    if (trimmed.length === 0) return ''
    return trimmed.length > 160 ? `${trimmed.slice(0, 157)}…` : trimmed
  }
  if (typeof result === 'object') {
    const obj = result as Record<string, unknown>
    const candidate =
      pickString(obj, ['message', 'summary', 'status']) ??
      pickStatusIndicator(obj, toolName)
    if (candidate) return candidate
    try {
      const json = JSON.stringify(result)
      return json.length > 160 ? `${json.slice(0, 157)}…` : json
    } catch {
      return ''
    }
  }
  return String(result)
}

function pickString(
  obj: Record<string, unknown>,
  keys: readonly string[],
): string | null {
  for (const key of keys) {
    const value = obj[key]
    if (typeof value === 'string' && value.trim().length > 0) {
      const trimmed = value.trim()
      return trimmed.length > 160 ? `${trimmed.slice(0, 157)}…` : trimmed
    }
  }
  return null
}

function pickStatusIndicator(
  obj: Record<string, unknown>,
  toolName: string,
): string | null {
  const status = obj.status
  if (typeof status === 'string') {
    if (toolName === 'proposeOrderDraft') {
      if (status === 'resolved') return 'Draft resolved'
      if (status === 'ambiguous') return 'Needs disambiguation'
      if (status === 'invalid') return 'Resolution failed'
    }
    if (toolName === 'confirmOrderDraft') {
      if (status === 'confirmed') return 'Draft confirmed'
      if (status === 'cancelled') return 'Draft cancelled'
    }
    if (toolName === 'businessOverview') return 'Workspace overview loaded'
    if (toolName === 'businessSearch') return 'Records matched'
  }
  const count = obj.count
  if (typeof count === 'number') {
    return `${count} record${count === 1 ? '' : 's'}`
  }
  return null
}

function detectMetadataFromToolResult(
  toolName: string,
  result: unknown,
): AssistantChatMessageMetadata | undefined {
  if (!result || typeof result !== 'object') return undefined
  const obj = result as Record<string, unknown>

  if (toolName === 'proposeOrderDraft' && typeof obj.actionId === 'string') {
    const actionId = obj.actionId
    let expiresAt =
      typeof obj.expiresAt === 'string'
        ? obj.expiresAt
        : new Date(Date.now() + 15 * 60_000).toISOString()
    try {
      const parsed = new Date(expiresAt)
      if (!Number.isNaN(parsed.getTime())) {
        expiresAt = parsed.toISOString()
      }
    } catch {
      // keep fallback
    }
    return {
      kind: 'order_draft_proposal',
      actionId,
      expiresAt,
    }
  }

  if (toolName === 'confirmOrderDraft') {
    const status = typeof obj.status === 'string' ? obj.status : ''
    const actionId = typeof obj.actionId === 'string' ? obj.actionId : null
    if (actionId && status === 'cancelled') {
      return { kind: 'order_draft_cancelled', actionId }
    }
    if (actionId && status === 'error') {
      return {
        kind: 'order_draft_error',
        actionId,
        reason:
          typeof obj.reason === 'string'
            ? obj.reason
            : 'The assistant could not apply the draft.',
      }
    }
  }

  return undefined
}

async function resolveAssistantRole(): Promise<{
  userId: string
  orgId: string
  role: 'owner' | 'admin'
}> {
  const { orgId, role } = await resolveOrgAndRole()
  if (!canUseAssistant(role as never)) {
    throw new Error('Not authorized')
  }
  const headers = getRequestHeaders()
  const session = await auth.api.getSession({ headers })
  if (!session) throw new Error('Not authenticated')
  return {
    userId: session.user.id,
    orgId,
    role: role as 'owner' | 'admin',
  }
}

export const Route = createFileRoute('/api/assistant/stream')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let payload: unknown
        try {
          payload = await request.json()
        } catch {
          logger.error('Failed to parse JSON body in assistant stream')
          return new Response('Invalid JSON body', { status: 400 })
        }

        if (!payload || typeof payload !== 'object') {
          logger.error('Invalid payload object in assistant stream')
          return new Response('Invalid payload', { status: 400 })
        }

        const { message, clientMessageId } = payload as {
          message?: unknown
          clientMessageId?: unknown
        }

        if (typeof message !== 'string' || message.trim().length === 0) {
          logger.error('Message is missing or empty in assistant stream')
          return new Response('Message is required', { status: 400 })
        }
        if (message.length > 2000) {
          logger.error(
            { messageLength: message.length },
            'Message too long in assistant stream',
          )
          return new Response('Message too long', { status: 400 })
        }

        logger.info(
          { clientMessageId, messageLength: message.length },
          'Assistant stream request received',
        )

        let authCtx: {
          userId: string
          orgId: string
          role: 'owner' | 'admin'
        }
        try {
          authCtx = await resolveAssistantRole()
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Unauthorized'
          logger.warn({ err }, 'Assistant stream unauthorized request')
          if (msg.includes('Not authorized')) {
            return new Response('Forbidden', { status: 403 })
          }
          return new Response('Unauthorized', { status: 401 })
        }

        logger.info(
          { userId: authCtx.userId, orgId: authCtx.orgId, role: authCtx.role },
          'Assistant stream request authorized',
        )
        const encoder = new TextEncoder()
        const assistantMessageId = crypto.randomUUID()
        const cid =
          typeof clientMessageId === 'string' && clientMessageId.length > 0
            ? clientMessageId
            : null
        const abortController = new AbortController()
        const requestContext = new RequestContext<{
          orgId: string
          userId: string
          role: 'owner' | 'admin'
        }>()
        requestContext.set('orgId', authCtx.orgId)
        requestContext.set('userId', authCtx.userId)
        requestContext.set('role', authCtx.role)
        const threadId = `assistant:${authCtx.orgId}:${authCtx.userId}`
        const resourceId = `org:${authCtx.orgId}:user:${authCtx.userId}`

        let closed = false
        let startAgent: (() => void) | undefined
        const stream = new ReadableStream<Uint8Array>({
          start(controller) {
            const send = (event: StreamEvent) => {
              if (closed) return
              try {
                controller.enqueue(encoder.encode(sseEncode(event)))
              } catch {
                closed = true
              }
            }

            // Cross common reverse-proxy buffering thresholds before agent work starts.
            try {
              controller.enqueue(encoder.encode(SSE_FLUSH_PREAMBLE))
            } catch {
              closed = true
              return
            }

            logger.info(
              { assistantMessageId, clientMessageId: cid },
              'Assistant stream sending ready event',
            )
            send({
              type: 'ready',
              assistantMessageId,
              clientMessageId: cid,
            })

            // Start after the first reader pull so initial SSE frames can flush.
            startAgent = () => {
              if (closed) return
              void (async () => {
                let pendingMetadata: AssistantChatMessageMetadata | undefined

                try {
                  const { mastra } = await import('#/mastra')
                  const agent = mastra.getAgentById('business-assistant')

                  logger.info(
                    { message: message.trim(), threadId, resourceId },
                    'Starting agent.stream execution',
                  )
                  const handleStream = await agent.stream(message.trim(), {
                    requestContext,
                    abortSignal: abortController.signal,
                    memory: {
                      thread: threadId,
                      resource: resourceId,
                    },
                  })

                  let hasSentFinish = false

                  for await (const chunk of handleStream.fullStream) {
                    if (closed) {
                      logger.info('Stream closed internally; breaking loop')
                      break
                    }

                    switch (chunk.type) {
                      case 'text-delta': {
                        const payload = chunk.payload as {
                          text?: unknown
                          delta?: unknown
                          textDelta?: unknown
                        }
                        const textStr =
                          typeof payload.text === 'string'
                            ? payload.text
                            : typeof payload.delta === 'string'
                              ? payload.delta
                              : typeof payload.textDelta === 'string'
                                ? payload.textDelta
                                : null
                        if (textStr) {
                          send({ type: 'text-delta', delta: textStr })
                        }
                        break
                      }
                      case 'reasoning-delta': {
                        const payload = chunk.payload as {
                          text?: unknown
                          delta?: unknown
                          reasoning?: unknown
                        }
                        const reasoningStr =
                          typeof payload.text === 'string'
                            ? payload.text
                            : typeof payload.delta === 'string'
                              ? payload.delta
                              : typeof payload.reasoning === 'string'
                                ? payload.reasoning
                                : null
                        if (reasoningStr) {
                          send({ type: 'reasoning-delta', delta: reasoningStr })
                        }
                        break
                      }
                      case 'tool-call': {
                        const payload = chunk.payload as {
                          toolCallId?: unknown
                          id?: unknown
                          toolName?: unknown
                          name?: unknown
                          args?: unknown
                        }
                        const toolCallId =
                          typeof payload.toolCallId === 'string'
                            ? payload.toolCallId
                            : typeof payload.id === 'string'
                              ? payload.id
                              : null
                        const toolName =
                          typeof payload.toolName === 'string'
                            ? payload.toolName
                            : typeof payload.name === 'string'
                              ? payload.name
                              : null
                        if (toolCallId && toolName) {
                          send({
                            type: 'tool-call',
                            toolCallId,
                            toolName,
                            args:
                              payload.args && typeof payload.args === 'object'
                                ? (payload.args as Record<string, unknown>)
                                : null,
                          })
                        }
                        break
                      }
                      case 'tool-result': {
                        const payload = chunk.payload as {
                          toolCallId?: unknown
                          id?: unknown
                          toolName?: unknown
                          name?: unknown
                          result?: unknown
                          isError?: unknown
                        }
                        const toolCallId =
                          typeof payload.toolCallId === 'string'
                            ? payload.toolCallId
                            : typeof payload.id === 'string'
                              ? payload.id
                              : null
                        const toolName =
                          typeof payload.toolName === 'string'
                            ? payload.toolName
                            : typeof payload.name === 'string'
                              ? payload.name
                              : null
                        if (toolCallId && toolName) {
                          const summary = summariseToolResult(
                            toolName,
                            payload.result,
                          )
                          const detected = detectMetadataFromToolResult(
                            toolName,
                            payload.result,
                          )
                          if (detected) {
                            logger.info(
                              { detectedMetadata: detected },
                              'Pending metadata detected from tool result',
                            )
                            pendingMetadata = detected
                          }

                          logger.info(
                            { toolName, toolCallId },
                            'Sending tool-result event',
                          )
                          send({
                            type: 'tool-result',
                            toolCallId,
                            toolName,
                            isError: payload.isError === true,
                            summary,
                          })
                        }
                        break
                      }
                      case 'finish': {
                        if (pendingMetadata) {
                          logger.info(
                            { pendingMetadata },
                            'Sending pending metadata event on finish',
                          )
                          send({
                            type: 'metadata',
                            clientMessageId: cid,
                            metadata: pendingMetadata,
                          })
                          pendingMetadata = undefined
                        }
                        logger.info({ cid }, 'Sending finish event')
                        send({ type: 'finish', clientMessageId: cid })
                        hasSentFinish = true
                        break
                      }
                      case 'error': {
                        const payload = chunk.payload as { message?: unknown }
                        const errorMsg =
                          typeof payload.message === 'string'
                            ? payload.message
                            : 'Unknown error'
                        logger.error({ errorMsg }, 'Mastra stream chunk error')
                        const lowerErr = errorMsg.toLowerCase()
                        const formattedMsg =
                          lowerErr.includes('429') ||
                          lowerErr.includes('rate limit') ||
                          lowerErr.includes('quota') ||
                          lowerErr.includes('too many requests')
                            ? 'Rate limit reached. Please try again in a moment.'
                            : errorMsg
                        send({
                          type: 'error',
                          message: formattedMsg,
                        })
                        break
                      }
                      default:
                        break
                    }
                  }

                  if (!hasSentFinish) {
                    if (pendingMetadata) {
                      logger.info(
                        { pendingMetadata },
                        'Sending fallback pending metadata event',
                      )
                      send({
                        type: 'metadata',
                        clientMessageId: cid,
                        metadata: pendingMetadata,
                      })
                    }
                    logger.info({ cid }, 'Sending fallback finish event')
                    send({ type: 'finish', clientMessageId: cid })
                  }
                } catch (err: unknown) {
                  if (closed) return
                  const message =
                    err instanceof Error ? err.message : 'Unknown error'
                  logger.error({ err }, 'assistant stream failed in generator')
                  const lowerMsg = message.toLowerCase()
                  if (
                    message.includes('MASTRA_MODEL') ||
                    message.includes('provider/model-name')
                  ) {
                    send({
                      type: 'error',
                      message: 'AI assistant is not configured',
                    })
                  } else if (
                    lowerMsg.includes('429') ||
                    lowerMsg.includes('rate limit') ||
                    lowerMsg.includes('quota') ||
                    lowerMsg.includes('too many requests')
                  ) {
                    send({
                      type: 'error',
                      message:
                        'Rate limit reached. Please try again in a moment.',
                    })
                  } else {
                    send({ type: 'error', message })
                  }
                } finally {
                  if (!closed) {
                    closed = true
                    try {
                      controller.close()
                    } catch {
                      // already closed
                    }
                  }
                }
              })()
            }
          },
          pull() {
            const launch = startAgent
            startAgent = undefined
            launch?.()
          },
          cancel() {
            closed = true
            abortController.abort()
          },
        })

        return new Response(stream, {
          status: 200,
          headers: {
            'Content-Type': 'text/event-stream; charset=utf-8',
            'Cache-Control': 'no-cache, no-transform',
            'X-Accel-Buffering': 'no',
            'x-no-compression': '1',
          },
        })
      },
    },
  },
})
