import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// ── Mocks ─────────────────────────────────────────────────────────

const {
  mockSelect,
  mockInsert,
  mockUpdate,
  mockDecrypt,
  mockSend,
  mockDownload,
  mockGenerate,
} = vi.hoisted(() => ({
  mockSelect: vi.fn(),
  mockInsert: vi.fn(),
  mockUpdate: vi.fn(),
  mockDecrypt: vi.fn(),
  mockSend: vi.fn(),
  mockDownload: vi.fn(),
  mockGenerate: vi.fn(),
}))

vi.mock('#/db/index', () => ({
  db: { select: mockSelect, insert: mockInsert, update: mockUpdate },
}))

vi.mock('#/lib/telegram', () => ({
  decryptTelegramBotToken: mockDecrypt,
  sendTelegramMessage: mockSend,
  downloadTelegramFile: mockDownload,
}))

vi.mock('#/mastra', () => ({
  mastra: {
    getAgentById: vi.fn(() => ({ generate: mockGenerate })),
  },
}))

vi.mock('#/messages', () => ({
  messages: {
    en: {
      channels: {
        telegramReplies: {
          requestSent: 'Your access request has been sent.',
          stillPending: 'Your access request is still pending.',
          revoked: 'Your access has been revoked.',
          welcome: 'Welcome! Your access is approved.',
          startRequired: 'Send /start to request access.',
          replaced: 'This bot was replaced.',
          photoDownloadFailed: 'Failed to download photo.',
          processingFailed: 'Something went wrong.',
          approvedNotification: 'Access approved!',
          revokedNotification: 'Access revoked.',
        },
      },
    },
    id: {
      channels: {
        telegramReplies: {
          requestSent: 'Permintaan akses Anda telah dikirim.',
          stillPending: 'Permintaan akses Anda masih menunggu.',
          revoked: 'Akses Anda telah dicabut.',
          welcome: 'Selamat datang! Akses Anda telah disetujui.',
          startRequired: 'Kirim /start untuk meminta akses.',
          replaced: 'Bot ini telah diganti.',
          photoDownloadFailed: 'Gagal mengunduh foto.',
          processingFailed: 'Terjadi kesalahan.',
          approvedNotification: 'Akses disetujui!',
          revokedNotification: 'Akses dicabut.',
        },
      },
    },
  },
}))

// ── Test helpers ──────────────────────────────────────────────────

function queryChain(rows: unknown[]) {
  const chain = {
    from: vi.fn(),
    where: vi.fn(),
    limit: vi.fn(),
  }
  chain.from.mockReturnValue(chain)
  chain.where.mockReturnValue(chain)
  chain.limit.mockResolvedValue(rows)
  return chain
}

function mutationChain() {
  const chain = { set: vi.fn(), values: vi.fn(), where: vi.fn() }
  chain.set.mockReturnValue(chain)
  chain.where.mockResolvedValue(undefined)
  chain.values.mockResolvedValue(undefined)
  return chain
}

const connectedChannel = {
  id: 'channel-1',
  orgId: 'org-1',
  status: 'connected',
  webhookSecret: 'valid-secret',
  botToken: 'encrypted-token',
  connectionVersion: 2,
}

const identity = { id: 'identity-1', providerUserId: '77' }

function telegramMessage(
  text: string,
  options: { photo?: boolean; languageCode?: string } = {},
) {
  return {
    update_id: Math.floor(Math.random() * 100_000),
    message: {
      text,
      chat: { id: 77, type: 'private' },
      from: {
        id: 77,
        first_name: 'Ada',
        username: 'ada',
        language_code: options.languageCode,
        is_bot: false,
      },
      ...(options.photo
        ? {
            photo: [
              { file_id: 'receipt', width: 300, height: 300, file_size: 12 },
            ],
          }
        : {}),
    },
  }
}

async function post(body: unknown, secret = 'valid-secret') {
  const { handleTelegramWebhook } = await import('../webhooks/telegram')
  return handleTelegramWebhook(
    new Request('https://example.com/api/webhooks/telegram', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(secret ? { 'X-Telegram-Bot-Api-Secret-Token': secret } : {}),
      },
      body: JSON.stringify(body),
    }),
  )
}

// ── Tests ─────────────────────────────────────────────────────────

describe('Telegram webhook', () => {
  let queryQueues: unknown[][]

  beforeEach(() => {
    queryQueues = []
    mockSelect.mockImplementation(() => queryChain(queryQueues.shift() ?? []))
    mockInsert.mockImplementation(() => mutationChain())
    mockUpdate.mockImplementation(() => mutationChain())
    mockDecrypt.mockReturnValue('decrypted-token')
    mockGenerate.mockResolvedValue({ text: 'Recorded.' })
    mockSend.mockResolvedValue(undefined)
    mockDownload.mockReset()
  })

  afterEach(() => vi.clearAllMocks())

  it('returns 401 when secret header is missing', async () => {
    const response = await post(telegramMessage('/start'), '')
    expect(response.status).toBe(401)
    expect(mockSelect).not.toHaveBeenCalled()
  })

  it('returns 401 when secret does not match any channel', async () => {
    queryQueues.push([]) // channel lookup returns empty
    const response = await post(telegramMessage('/start'), 'wrong-secret')
    expect(response.status).toBe(401)
  })

  it('returns 500 when bot token decryption fails', async () => {
    queryQueues.push([connectedChannel])
    mockDecrypt.mockImplementation(() => {
      throw new Error('decryption failed')
    })
    const response = await post(telegramMessage('/start'))
    expect(response.status).toBe(500)
    expect(mockSend).not.toHaveBeenCalled()
  })

  it('creates a pending access on /start from new identity', async () => {
    // channel lookup, identity lookup (empty), access lookup (empty)
    queryQueues.push([connectedChannel], [], [], [])
    const response = await post(telegramMessage('/start'))
    expect(response.status).toBe(200)

    // Insert: identity, access, record
    expect(mockInsert).toHaveBeenCalledTimes(3)
    const accessValues = mockInsert.mock.results[1]?.value
    expect(accessValues).toBeDefined()
    expect(accessValues.values).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'pending',
        startedConnectionVersion: 2,
      }),
    )
    expect(mockGenerate).not.toHaveBeenCalled()
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        token: 'decrypted-token',
        chatId: 77,
        text: expect.stringContaining('access request'),
      }),
    )
  })

  it('replies "still pending" on /start when access is already pending', async () => {
    queryQueues.push(
      [connectedChannel],
      [],
      [identity],
      [{ id: 'access-1', status: 'pending' }],
    )
    const response = await post(telegramMessage('/start'))
    expect(response.status).toBe(200)
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        token: 'decrypted-token',
        chatId: 77,
        text: expect.stringContaining('pending'),
      }),
    )
    expect(mockGenerate).not.toHaveBeenCalled()
  })

  it('replies "revoked" on /start when access is revoked', async () => {
    queryQueues.push(
      [connectedChannel],
      [],
      [identity],
      [{ id: 'access-1', status: 'revoked' }],
    )
    const response = await post(telegramMessage('/start'))
    expect(response.status).toBe(200)
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        token: 'decrypted-token',
        chatId: 77,
        text: expect.stringContaining('revoked'),
      }),
    )
  })

  it('refreshes connection version stamp on /start from approved identity', async () => {
    queryQueues.push(
      [connectedChannel],
      [],
      [identity],
      [{ id: 'access-1', status: 'approved', startedConnectionVersion: 2 }],
    )
    const response = await post(telegramMessage('/start'))
    expect(response.status).toBe(200)
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        token: 'decrypted-token',
        chatId: 77,
        text: expect.stringContaining('Welcome'),
      }),
    )
  })

  it('blocks non-start message when no access exists', async () => {
    queryQueues.push([connectedChannel], [], [identity], [])
    const response = await post(telegramMessage('Hello'))
    expect(response.status).toBe(200)
    expect(mockGenerate).not.toHaveBeenCalled()
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        token: 'decrypted-token',
        chatId: 77,
        text: expect.stringContaining('/start'),
      }),
    )
  })

  it('blocks pending identity from sending messages', async () => {
    queryQueues.push(
      [connectedChannel],
      [],
      [identity],
      [{ id: 'access-1', status: 'pending' }],
    )
    const response = await post(telegramMessage('Hello'))
    expect(response.status).toBe(200)
    expect(mockGenerate).not.toHaveBeenCalled()
  })

  it('blocks revoked identity from sending messages', async () => {
    queryQueues.push(
      [connectedChannel],
      [],
      [identity],
      [{ id: 'access-1', status: 'revoked' }],
    )
    const response = await post(telegramMessage('Hello'))
    expect(response.status).toBe(200)
    expect(mockGenerate).not.toHaveBeenCalled()
  })

  it('blocks approved identity when connection version mismatched', async () => {
    queryQueues.push(
      [connectedChannel],
      [],
      [identity],
      [{ id: 'access-1', status: 'approved', startedConnectionVersion: 1 }],
    )
    const response = await post(telegramMessage('Hello'))
    expect(response.status).toBe(200)
    expect(mockGenerate).not.toHaveBeenCalled()
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        token: 'decrypted-token',
        chatId: 77,
        text: expect.stringContaining('replaced'),
      }),
    )
  })

  it('routes approved text to the business-assistant agent', async () => {
    queryQueues.push(
      [connectedChannel],
      [],
      [identity],
      [{ id: 'access-1', status: 'approved', startedConnectionVersion: 2 }],
      [{ role: 'owner' }],
    )
    const response = await post(telegramMessage('Expense 50000 lunch'))
    expect(response.status).toBe(200)
    expect(mockGenerate).toHaveBeenCalledWith(
      'Expense 50000 lunch',
      expect.objectContaining({
        requestContext: expect.anything(),
      }),
    )
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({ text: 'Recorded.' }),
    )
  })

  it('passes photo bytes as image context without persistence', async () => {
    queryQueues.push(
      [connectedChannel],
      [],
      [identity],
      [{ id: 'access-1', status: 'approved', startedConnectionVersion: 2 }],
      [{ role: 'owner' }],
    )
    mockDownload.mockResolvedValue({
      bytes: new Uint8Array([1, 2, 3]),
      filePath: 'photos/receipt.jpg',
      contentType: 'image/jpeg',
    })

    const response = await post(telegramMessage('Lunch', { photo: true }))
    expect(response.status).toBe(200)
    expect(mockDownload).toHaveBeenCalledWith(
      expect.objectContaining({
        token: 'decrypted-token',
        fileId: 'receipt',
      }),
    )
    expect(mockGenerate).toHaveBeenCalledWith(
      'Lunch',
      expect.objectContaining({
        context: expect.arrayContaining([
          expect.objectContaining({
            role: 'user',
            content: expect.arrayContaining([
              expect.objectContaining({
                type: 'image',
                image: expect.any(Uint8Array),
              }),
            ]),
          }),
        ]),
      }),
    )
  })

  it('replies localized error when agent throws', async () => {
    queryQueues.push(
      [connectedChannel],
      [],
      [identity],
      [{ id: 'access-1', status: 'approved', startedConnectionVersion: 2 }],
      [{ role: 'owner' }],
    )
    mockGenerate.mockRejectedValue(new Error('LLM timeout'))

    const response = await post(telegramMessage('Hello'))
    expect(response.status).toBe(200)
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining('wrong'),
      }),
    )
  })

  it('skips processing when update_id was already processed', async () => {
    queryQueues.push([connectedChannel], [{ id: 'existing' }])

    const response = await post(telegramMessage('/start'))
    expect(response.status).toBe(200)
    // Short-circuits after idempotency check — no further processing
    expect(mockSelect).toHaveBeenCalledTimes(2)
    expect(mockInsert).not.toHaveBeenCalled()
    expect(mockGenerate).not.toHaveBeenCalled()
  })

  it('ignores messages from group chats', async () => {
    queryQueues.push([connectedChannel])
    const body = {
      update_id: 99999,
      message: {
        text: 'Hello',
        chat: { id: -100123, type: 'supergroup' },
        from: { id: 77, first_name: 'Ada', is_bot: false },
      },
    }
    const response = await post(body)
    expect(response.status).toBe(200)
    // Only channel lookup happened — no identity or access queries
    expect(mockSelect).toHaveBeenCalledTimes(2)
  })

  it('ignores bot messages', async () => {
    queryQueues.push([connectedChannel])
    const body = {
      update_id: 99998,
      message: {
        text: 'Automated',
        chat: { id: 77, type: 'private' },
        from: { id: 123, first_name: 'OtherBot', is_bot: true },
      },
    }
    const response = await post(body)
    expect(response.status).toBe(200)
    expect(mockSelect).toHaveBeenCalledTimes(2)
  })

  it('denies agent access to an approved identity with no org membership', async () => {
    // channel, identity, access, member lookup (empty)
    queryQueues.push(
      [connectedChannel],
      [],
      [identity],
      [{ id: 'access-1', status: 'approved', startedConnectionVersion: 2 }],
      [],
    )
    const response = await post(telegramMessage('Hello'))
    expect(response.status).toBe(200)
    expect(mockGenerate).not.toHaveBeenCalled()
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining('wrong'),
      }),
    )
  })
})
