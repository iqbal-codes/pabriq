import { handleChatStream } from '@mastra/ai-sdk'
import { RequestContext } from '@mastra/core/request-context'
import { createFileRoute } from '@tanstack/react-router'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { createUIMessageStreamResponse } from 'ai'
import { auth } from '#/lib/auth'
import { resolveOrgAndRole } from '#/lib/auth-session-server'
import { mastra } from '#/mastra'

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

export const Route = createFileRoute('/api/assistant/chat')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let authContext: {
          userId: string
          orgId: string
          role: 'owner' | 'admin' | 'member'
        }
        try {
          authContext = await resolveAssistantRole()
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Unauthorized'
          if (message.includes('Not authorized')) {
            return new Response('Forbidden', { status: 403 })
          }
          return new Response('Unauthorized', { status: 401 })
        }

        const params = await request.json()
        const threadId = `assistant:${authContext.orgId}:${authContext.userId}`
        const resourceId = `org:${authContext.orgId}:user:${authContext.userId}`
        const requestContext = new RequestContext<{
          orgId: string
          userId: string
          role: 'owner' | 'admin' | 'member'
        }>()
        requestContext.set('orgId', authContext.orgId)
        requestContext.set('userId', authContext.userId)
        requestContext.set('role', authContext.role)

        const stream = await handleChatStream({
          mastra,
          agentId: 'business-assistant',
          params: {
            ...params,
            threadId,
            resourceId,
            requestContext,
            memory: {
              ...params.memory,
              thread: threadId,
              resource: resourceId,
            },
          },
          version: 'v6',
        })
        return createUIMessageStreamResponse({ stream })
      },
    },
  },
})
