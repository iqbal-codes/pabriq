import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('#/lib/auth-session-server', () => ({
  resolveOrgAndRole: vi.fn(),
}))

vi.mock('#/lib/auth', () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}))

vi.mock('@tanstack/react-start/server', () => ({
  getRequestHeaders: vi.fn(() => ({})),
}))

vi.mock('#/mastra', () => ({
  mastra: {
    getAgentById: vi.fn(() => ({
      stream: vi.fn(),
    })),
  },
}))
vi.mock('@mastra/ai-sdk', () => ({
  handleChatStream: vi.fn().mockResolvedValue(new ReadableStream()),
}))

vi.mock('ai', () => ({
  createUIMessageStreamResponse: vi.fn(
    () => new Response('ok', { status: 200 }),
  ),
}))

import { auth } from '#/lib/auth'
import { resolveOrgAndRole } from '#/lib/auth-session-server'
import { Route as ChatRoute } from './chat'
import { Route as StreamRoute } from './stream'

const mockResolveOrgAndRole = vi.mocked(resolveOrgAndRole)
const mockGetSession = vi.mocked(auth.api.getSession)

function makeRequest(body: Record<string, unknown> = { message: 'Hello' }) {
  return new Request('http://localhost/api/assistant/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const chatServerOptions = ChatRoute.options.server as {
  handlers?: { POST: (ctx: { request: Request }) => Promise<Response> }
}
const chatHandler = chatServerOptions?.handlers?.POST

const streamServerOptions = StreamRoute.options.server as {
  handlers?: { POST: (ctx: { request: Request }) => Promise<Response> }
}
const streamHandler = streamServerOptions?.handlers?.POST

describe('POST /api/assistant/chat — role gating', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetSession.mockResolvedValue({
      user: { id: 'user-1' },
    } as never)
  })

  it('rejects member role with 403', async () => {
    expect(chatHandler).toBeDefined()
    if (!chatHandler) return

    mockResolveOrgAndRole.mockResolvedValue({ orgId: 'org-1', role: 'member' })

    const response = await chatHandler({ request: makeRequest() })
    expect(response.status).toBe(403)
  })

  it('allows admin role', async () => {
    expect(chatHandler).toBeDefined()
    if (!chatHandler) return

    mockResolveOrgAndRole.mockResolvedValue({ orgId: 'org-1', role: 'admin' })

    const response = await chatHandler({ request: makeRequest() })
    expect(response.status).not.toBe(403)
  })

  it('allows owner role', async () => {
    expect(chatHandler).toBeDefined()
    if (!chatHandler) return

    mockResolveOrgAndRole.mockResolvedValue({ orgId: 'org-1', role: 'owner' })

    const response = await chatHandler({ request: makeRequest() })
    expect(response.status).not.toBe(403)
  })
})

describe('POST /api/assistant/stream — role gating', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetSession.mockResolvedValue({
      user: { id: 'user-1' },
    } as never)
  })

  it('rejects member role with 403', async () => {
    expect(streamHandler).toBeDefined()
    if (!streamHandler) return

    mockResolveOrgAndRole.mockResolvedValue({ orgId: 'org-1', role: 'member' })

    const response = await streamHandler({ request: makeRequest() })
    expect(response.status).toBe(403)
  })

  it('allows admin role', async () => {
    expect(streamHandler).toBeDefined()
    if (!streamHandler) return

    mockResolveOrgAndRole.mockResolvedValue({ orgId: 'org-1', role: 'admin' })

    const response = await streamHandler({ request: makeRequest() })
    expect(response.status).not.toBe(403)
  })

  it('allows owner role', async () => {
    expect(streamHandler).toBeDefined()
    if (!streamHandler) return

    mockResolveOrgAndRole.mockResolvedValue({ orgId: 'org-1', role: 'owner' })

    const response = await streamHandler({ request: makeRequest() })
    expect(response.status).not.toBe(403)
  })
})
