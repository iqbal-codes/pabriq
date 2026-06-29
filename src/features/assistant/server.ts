import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import type {
  AssistantChatMessage,
  AssistantRole,
} from '#/features/assistant/model'
import {
  buildAssistantMemoryScope,
  normalizeMastraMemoryMessages,
} from '#/features/assistant/model'

async function resolveAssistantAuthContext(): Promise<{
  userId: string
  orgId: string
  role: AssistantRole
}> {
  const [{ getRequestHeaders }, { auth }, { db }, { member }, { eq }] =
    await Promise.all([
      import('@tanstack/react-start/server'),
      import('#/lib/auth'),
      import('#/db/index'),
      import('#/db/schema'),
      import('drizzle-orm'),
    ])

  const headers = getRequestHeaders()
  const session = await auth.api.getSession({ headers })
  if (!session) throw new Error('Not authenticated')

  const memberships = await db
    .select({
      orgId: member.organizationId,
      role: member.role,
    })
    .from(member)
    .where(eq(member.userId, session.user.id))
    .limit(1)

  if (memberships.length === 0) throw new Error('No organization')

  const role = memberships[0].role as string
  if (role !== 'owner' && role !== 'admin' && role !== 'member') {
    throw new Error('Not authorized')
  }

  return {
    userId: session.user.id,
    orgId: memberships[0].orgId,
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
