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

const assistantMocks = vi.hoisted(() => ({
  agentStream: vi.fn(),
}))

vi.mock('#/mastra', () => ({
  mastra: {
    getAgentById: vi.fn(() => ({
      stream: assistantMocks.agentStream,
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

  it('keeps the SSE response browser-readable and streams agent frames', async () => {
    vi.clearAllMocks()
    mockGetSession.mockResolvedValue({
      user: { id: 'user-1' },
    } as never)
    expect(streamHandler).toBeDefined()
    if (!streamHandler) return

    mockResolveOrgAndRole.mockResolvedValue({ orgId: 'org-1', role: 'admin' })
    assistantMocks.agentStream.mockResolvedValue({
      fullStream: (async function* () {
        yield { type: 'text-delta', payload: { text: 'Hello' } }
        yield { type: 'finish', payload: {} }
      })(),
    })

    const response = await streamHandler({ request: makeRequest() })

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('text/event-stream')
    expect(response.headers.get('content-encoding')).toBeNull()

    const reader = response.body?.getReader()
    expect(reader).toBeDefined()
    if (!reader) return

    const decoder = new TextDecoder()
    let body = ''
    while (!body.includes('"type":"ready"')) {
      const { done, value } = await reader.read()
      expect(done).toBe(false)
      if (done) return
      body += decoder.decode(value)
    }

    while (!body.includes('"type":"finish"')) {
      const { done, value } = await reader.read()
      if (done) break
      body += decoder.decode(value)
    }

    expect(body).toContain('"type":"text-delta"')
    expect(body).toContain('"delta":"Hello"')
    expect(body).toContain('"type":"finish"')
  })

  it('flushes a large SSE preamble before the agent completes', async () => {
    vi.clearAllMocks()
    mockGetSession.mockResolvedValue({
      user: { id: 'user-1' },
    } as never)
    expect(streamHandler).toBeDefined()
    if (!streamHandler) return

    mockResolveOrgAndRole.mockResolvedValue({ orgId: 'org-1', role: 'admin' })
    let releaseAgent = () => {}
    const agentGate = new Promise<void>((resolve) => {
      releaseAgent = resolve
    })
    assistantMocks.agentStream.mockResolvedValue({
      fullStream: (async function* () {
        await agentGate
        yield { type: 'finish', payload: {} }
      })(),
    })

    const response = await streamHandler({ request: makeRequest() })
    const reader = response.body?.getReader()
    expect(reader).toBeDefined()
    if (!reader) return

    try {
      const { done, value } = await reader.read()
      expect(done).toBe(false)
      expect(value).toBeDefined()
      if (!value) return
      expect(value.byteLength).toBeGreaterThanOrEqual(4096)
    } finally {
      releaseAgent()
      await reader.cancel()
    }
  })
  it('starts the agent after the initial SSE frames are readable', async () => {
    vi.clearAllMocks()
    mockGetSession.mockResolvedValue({
      user: { id: 'user-1' },
    } as never)
    expect(streamHandler).toBeDefined()
    if (!streamHandler) return

    mockResolveOrgAndRole.mockResolvedValue({ orgId: 'org-1', role: 'admin' })
    let releaseAgent = () => {}
    const agentGate = new Promise<void>((resolve) => {
      releaseAgent = resolve
    })
    let markAgentStarted = () => {}
    const agentStarted = new Promise<void>((resolve) => {
      markAgentStarted = resolve
    })
    assistantMocks.agentStream.mockImplementation(async () => {
      markAgentStarted()
      return {
        fullStream: (async function* () {
          await agentGate
          yield { type: 'finish', payload: {} }
        })(),
      }
    })

    const response = await streamHandler({ request: makeRequest() })
    expect(assistantMocks.agentStream).not.toHaveBeenCalled()
    const reader = response.body?.getReader()
    expect(reader).toBeDefined()
    if (!reader) return

    try {
      const first = await reader.read()
      expect(first.done).toBe(false)
      expect(first.value?.byteLength).toBeGreaterThanOrEqual(4096)
      expect(assistantMocks.agentStream).not.toHaveBeenCalled()

      const second = await reader.read()
      expect(second.done).toBe(false)
      await agentStarted
      expect(assistantMocks.agentStream).toHaveBeenCalledTimes(1)
    } finally {
      releaseAgent()
      await reader.cancel()
    }
  })
})
