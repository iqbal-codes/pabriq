import { RequestContext } from '@mastra/core/request-context'
import { createFileRoute } from '@tanstack/react-router'
import { getRequestHeaders } from '@tanstack/react-start/server'
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
      // keep the fallback
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
  role: 'owner' | 'admin' | 'member'
}> {
  const { orgId, role } = await resolveOrgAndRole()
  const validRoles = ['owner', 'admin', 'member']
  if (!validRoles.includes(role)) {
    throw new Error('Not authorized')
  }
  const headers = getRequestHeaders()
  const session = await auth.api.getSession({ headers })
  if (!session) throw new Error('Not authenticated')
  return {
    userId: session.user.id,
    orgId,
    role: role as 'owner' | 'admin' | 'member',
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
          return new Response('Invalid JSON body', { status: 400 })
        }

        if (!payload || typeof payload !== 'object') {
          return new Response('Invalid payload', { status: 400 })
        }

        const { message, clientMessageId } = payload as {
          message?: unknown
          clientMessageId?: unknown
        }

        if (typeof message !== 'string' || message.trim().length === 0) {
          return new Response('Message is required', { status: 400 })
        }
        if (message.length > 2000) {
          return new Response('Message too long', { status: 400 })
        }

        try {
          await resolveAssistantRole()
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Unauthorized'
          if (message.includes('Not authorized')) {
            return new Response('Forbidden', { status: 403 })
          }
          return new Response('Unauthorized', { status: 401 })
        }

        const encoder = new TextEncoder()
        const assistantMessageId = crypto.randomUUID()
        const cid =
          typeof clientMessageId === 'string' && clientMessageId.length > 0
            ? clientMessageId
            : null
        const abortController = new AbortController()

        const stream = new ReadableStream<Uint8Array>({
          async start(controller) {
            let closed = false
            const send = (event: StreamEvent) => {
              if (closed) return
              try {
                controller.enqueue(encoder.encode(sseEncode(event)))
              } catch {
                closed = true
              }
            }

            let pendingMetadata: AssistantChatMessageMetadata | undefined

            try {
              const authCtx = await resolveAssistantRole()
              const { mastra } = await import('#/mastra')
              const agent = mastra.getAgentById('business-assistant')

              const requestContext = new RequestContext<{
                orgId: string
                userId: string
                role: 'owner' | 'admin' | 'member'
              }>()
              requestContext.set('orgId', authCtx.orgId)
              requestContext.set('userId', authCtx.userId)
              requestContext.set('role', authCtx.role)

              send({
                type: 'ready',
                assistantMessageId,
                clientMessageId: cid,
              })

              const handleStream = await agent.stream(message.trim(), {
                requestContext,
                abortSignal: abortController.signal,
                memory: {
                  thread: `assistant:${authCtx.orgId}:${authCtx.userId}`,
                  resource: `org:${authCtx.orgId}:user:${authCtx.userId}`,
                },
              })

              let hasSentFinish = false

              for await (const chunk of handleStream.fullStream) {
                if (closed) break

                switch (chunk.type) {
                  case 'text-delta': {
                    const payload = chunk.payload as { text?: unknown }
                    if (typeof payload.text === 'string') {
                      send({ type: 'text-delta', delta: payload.text })
                    }
                    break
                  }
                  case 'tool-call': {
                    const payload = chunk.payload as {
                      toolCallId?: unknown
                      toolName?: unknown
                      args?: unknown
                    }
                    if (
                      typeof payload.toolCallId === 'string' &&
                      typeof payload.toolName === 'string'
                    ) {
                      send({
                        type: 'tool-call',
                        toolCallId: payload.toolCallId,
                        toolName: payload.toolName,
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
                      toolName?: unknown
                      result?: unknown
                      isError?: unknown
                    }
                    if (
                      typeof payload.toolCallId === 'string' &&
                      typeof payload.toolName === 'string'
                    ) {
                      const summary = summariseToolResult(
                        payload.toolName,
                        payload.result,
                      )
                      const detected = detectMetadataFromToolResult(
                        payload.toolName,
                        payload.result,
                      )
                      if (detected) pendingMetadata = detected

                      send({
                        type: 'tool-result',
                        toolCallId: payload.toolCallId,
                        toolName: payload.toolName,
                        isError: payload.isError === true,
                        summary,
                      })
                    }
                    break
                  }
                  case 'finish': {
                    if (pendingMetadata) {
                      send({
                        type: 'metadata',
                        clientMessageId: cid,
                        metadata: pendingMetadata,
                      })
                      pendingMetadata = undefined
                    }
                    send({ type: 'finish', clientMessageId: cid })
                    hasSentFinish = true
                    break
                  }
                  case 'error': {
                    const payload = chunk.payload as { message?: unknown }
                    send({
                      type: 'error',
                      message:
                        typeof payload.message === 'string'
                          ? payload.message
                          : 'Unknown error',
                    })
                    break
                  }
                  default:
                    break
                }
              }

              if (!hasSentFinish) {
                if (pendingMetadata) {
                  send({
                    type: 'metadata',
                    clientMessageId: cid,
                    metadata: pendingMetadata,
                  })
                }
                send({ type: 'finish', clientMessageId: cid })
              }
            } catch (err: unknown) {
              if (closed) return
              const message =
                err instanceof Error ? err.message : 'Unknown error'
              logger.error({ err }, 'assistant stream failed')
              if (
                message.includes('MASTRA_MODEL') ||
                message.includes('provider/model-name')
              ) {
                send({
                  type: 'error',
                  message: 'AI assistant is not configured',
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
          },
          cancel() {
            abortController.abort()
          },
        })

        return new Response(stream, {
          status: 200,
          headers: {
            'Content-Type': 'text/event-stream; charset=utf-8',
            'Cache-Control': 'no-cache, no-transform',
            Connection: 'keep-alive',
            'X-Accel-Buffering': 'no',
          },
        })
      },
    },
  },
})
