import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import type { AssistantActionPayload } from '#/db/schema'
import type {
  AssistantChatMessage,
  AssistantRole,
} from '#/features/assistant/model'
import {
  buildAssistantMemoryScope,
  normalizeMastraMemoryMessages,
} from '#/features/assistant/model'
import { resolveOrgAndRole } from '#/lib/auth-session-server'

async function resolveAssistantAuthContext(): Promise<{
  userId: string
  orgId: string
  role: AssistantRole
}> {
  const [{ getRequestHeaders }, { auth }] = await Promise.all([
    import('@tanstack/react-start/server'),
    import('#/lib/auth'),
  ])

  const { orgId, role } = await resolveOrgAndRole()

  const validRoles: readonly string[] = ['owner', 'admin', 'member']
  if (!validRoles.includes(role)) {
    throw new Error('Not authorized')
  }

  const headers = getRequestHeaders()
  const session = await auth.api.getSession({ headers })
  if (!session) throw new Error('Not authenticated')

  return {
    userId: session.user.id,
    orgId,
    role: role as AssistantRole,
  }
}

export const loadAssistantChatFn = createServerFn({ method: 'GET' })
  .inputValidator((input: Record<string, never>) => input)
  .handler(
    async (): Promise<
      | { ok: true; messages: AssistantChatMessage[] }
      | { ok: false; error: string }
    > => {
      try {
        const authCtx = await resolveAssistantAuthContext()
        const scope = buildAssistantMemoryScope(authCtx)

        const { mastra } = await import('#/mastra')
        const agent = mastra.getAgentById('business-assistant')
        const memory = await agent.getMemory()

        if (!memory) {
          return { ok: true, messages: [] }
        }

        const result = await memory.recall({
          threadId: scope.thread,
          resourceId: scope.resource,
          perPage: 50,
          page: 0,
        })

        const messages = normalizeMastraMemoryMessages(result.messages ?? [])
        return { ok: true, messages }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        if (
          message.includes('MASTRA_MODEL') ||
          message.includes('provider/model-name')
        ) {
          return { ok: false, error: 'AI assistant is not configured' }
        }
        return { ok: false, error: message }
      }
    },
  )

export const sendAssistantMessageFn = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ message: z.string().trim().min(1).max(2000) }))
  .handler(
    async (
      ctx,
    ): Promise<
      { ok: true; message: AssistantChatMessage } | { ok: false; error: string }
    > => {
      try {
        const authCtx = await resolveAssistantAuthContext()
        const scope = buildAssistantMemoryScope(authCtx)

        const { RequestContext } = await import('@mastra/core/request-context')
        const requestContext = new RequestContext<{
          orgId: string
          userId: string
          role: AssistantRole
        }>()
        requestContext.set('orgId', authCtx.orgId)
        requestContext.set('userId', authCtx.userId)
        requestContext.set('role', authCtx.role)

        const { mastra } = await import('#/mastra')
        const agent = mastra.getAgentById('business-assistant')

        const response = await agent.generate(ctx.data.message, {
          requestContext,
          memory: {
            thread: scope.thread,
            resource: scope.resource,
          },
        })

        return {
          ok: true,
          message: {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: response.text,
            createdAt: new Date().toISOString(),
          },
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        if (
          message.includes('MASTRA_MODEL') ||
          message.includes('provider/model-name')
        ) {
          return { ok: false, error: 'AI assistant is not configured' }
        }
        return { ok: false, error: message }
      }
    },
  )

export const consumeOrderDraftProposalFn = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      actionId: z.string(),
      threadId: z.string(),
      resourceId: z.string(),
    }),
  )
  .handler(
    async ({
      data,
    }): Promise<
      { ok: true; orderId: string } | { ok: false; error: string }
    > => {
      try {
        const authCtx = await resolveAssistantAuthContext()
        const [{ db }, { assistantActions }, { and, eq }] = await Promise.all([
          import('#/db/index'),
          import('#/db/schema'),
          import('drizzle-orm'),
        ])

        const orderId = await db.transaction(async (tx) => {
          const rows = await tx
            .select({
              id: assistantActions.id,
              payload: assistantActions.payload,
              expiresAt: assistantActions.expiresAt,
            })
            .from(assistantActions)
            .where(
              and(
                eq(assistantActions.id, data.actionId),
                eq(assistantActions.status, 'pending'),
                eq(assistantActions.orgId, authCtx.orgId),
              ),
            )
            .for('update')
            .limit(1)

          if (rows.length === 0) {
            throw new Error('NOT_PENDING')
          }

          const action = rows[0]
          if (action.expiresAt < new Date()) {
            throw new Error('EXPIRED')
          }

          const { createDraftOrderFromAction } = await import(
            '#/features/orders/model'
          )
          const result = await createDraftOrderFromAction(
            authCtx.orgId,
            action.payload as AssistantActionPayload,
          )

          await tx
            .update(assistantActions)
            .set({
              status: 'confirmed',
              resultOrderId: result.order.id,
              updatedAt: new Date(),
            })
            .where(eq(assistantActions.id, data.actionId))

          return result.order.id
        })

        return { ok: true, orderId }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        if (message.includes('NOT_PENDING')) {
          return {
            ok: false,
            error: 'Proposal already consumed or cancelled',
          }
        }
        if (message.includes('EXPIRED')) {
          return {
            ok: false,
            error: 'Proposal expired; ask the assistant to create a fresh one',
          }
        }
        return { ok: false, error: message }
      }
    },
  )

export const cancelOrderDraftProposalFn = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      actionId: z.string(),
      threadId: z.string(),
      resourceId: z.string(),
    }),
  )
  .handler(
    async ({ data }): Promise<{ ok: true } | { ok: false; error: string }> => {
      try {
        const authCtx = await resolveAssistantAuthContext()
        const [{ db }, { assistantActions }, { and, eq }] = await Promise.all([
          import('#/db/index'),
          import('#/db/schema'),
          import('drizzle-orm'),
        ])

        const result = await db
          .update(assistantActions)
          .set({ status: 'cancelled', updatedAt: new Date() })
          .where(
            and(
              eq(assistantActions.id, data.actionId),
              eq(assistantActions.status, 'pending'),
              eq(assistantActions.orgId, authCtx.orgId),
            ),
          )
          .returning({ id: assistantActions.id })

        if (result.length === 0) {
          return {
            ok: false,
            error: 'Proposal already consumed or cancelled',
          }
        }

        return { ok: true }
      } catch (err: unknown) {
        return {
          ok: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        }
      }
    },
  )

export const getProposalFn = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ actionId: z.string() }))
  .handler(
    async ({
      data,
    }): Promise<
      | {
          ok: true
          payload: AssistantActionPayload
          status: string
          expiresAt: string
        }
      | { ok: false; error: string }
    > => {
      try {
        const authCtx = await resolveAssistantAuthContext()
        const [{ db }, { assistantActions }, { and, eq }] = await Promise.all([
          import('#/db/index'),
          import('#/db/schema'),
          import('drizzle-orm'),
        ])

        const rows = await db
          .select({
            payload: assistantActions.payload,
            status: assistantActions.status,
            expiresAt: assistantActions.expiresAt,
          })
          .from(assistantActions)
          .where(
            and(
              eq(assistantActions.id, data.actionId),
              eq(assistantActions.orgId, authCtx.orgId),
            ),
          )
          .limit(1)

        if (rows.length === 0) {
          return { ok: false, error: 'Proposal not found' }
        }

        const row = rows[0]
        return {
          ok: true,
          payload: row.payload as AssistantActionPayload,
          status: row.status,
          expiresAt:
            row.expiresAt instanceof Date
              ? row.expiresAt.toISOString()
              : new Date(row.expiresAt).toISOString(),
        }
      } catch (err: unknown) {
        return {
          ok: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        }
      }
    },
  )
