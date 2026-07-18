import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'node:crypto'

// ── Telegram Bot API envelope ──────────────────────────────────

type TelegramEnvelope<T> = {
  ok: boolean
  result?: T
  description?: string
}

// ── Public types ───────────────────────────────────────────────

export type TelegramBotInfo = {
  id: number
  first_name: string
  username?: string
}

/** Opaque encrypted bot token — never contains plaintext. */
export type EncryptedPayload = string & { readonly __brand: 'EncryptedPayload' }

// ── Encryption helpers ─────────────────────────────────────────

function requireEncryptionKey(): Buffer {
  const key = process.env.TELEGRAM_TOKEN_ENCRYPTION_KEY
  if (!key) {
    throw new Error(
      'Telegram channel credentials are unavailable: TELEGRAM_TOKEN_ENCRYPTION_KEY is not configured',
    )
  }
  return createHash('sha256').update(key).digest()
}

export function encryptTelegramBotToken(token: string): EncryptedPayload {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', requireEncryptionKey(), iv)
  const ciphertext = Buffer.concat([
    cipher.update(token, 'utf8'),
    cipher.final(),
  ])
  const tag = cipher.getAuthTag()
  return [iv, tag, ciphertext]
    .map((part) => part.toString('base64url'))
    .join('.') as EncryptedPayload
}

export function decryptTelegramBotToken(encryptedToken: string): string {
  const [ivValue, tagValue, ciphertextValue] = encryptedToken.split('.')
  if (!ivValue || !tagValue || !ciphertextValue) {
    throw new Error('Stored Telegram channel credential is invalid')
  }

  const decipher = createDecipheriv(
    'aes-256-gcm',
    requireEncryptionKey(),
    Buffer.from(ivValue, 'base64url'),
  )
  decipher.setAuthTag(Buffer.from(tagValue, 'base64url'))
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextValue, 'base64url')),
    decipher.final(),
  ]).toString('utf8')
}

// ── Telegram Bot API client ────────────────────────────────────

async function callTelegram<T>(
  token: string,
  method: string,
  body?: unknown,
): Promise<T> {
  const response = await fetch(
    `https://api.telegram.org/bot${token}/${method}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    },
  )
  const payload = (await response
    .json()
    .catch(() => null)) as TelegramEnvelope<T> | null

  if (!response.ok || !payload?.ok || payload.result === undefined) {
    throw new Error(payload?.description ?? `Telegram ${method} request failed`)
  }

  return payload.result
}

export function getTelegramMe(botToken: string): Promise<TelegramBotInfo> {
  return callTelegram<TelegramBotInfo>(botToken, 'getMe')
}

export function setTelegramWebhook(input: {
  token: string
  url: string
  secretToken: string
}): Promise<boolean> {
  return callTelegram<boolean>(input.token, 'setWebhook', {
    url: input.url,
    secret_token: input.secretToken,
    allowed_updates: ['message'],
  })
}

export function deleteTelegramWebhook(token: string): Promise<boolean> {
  return callTelegram<boolean>(token, 'deleteWebhook', {
    drop_pending_updates: false,
  })
}

export async function sendTelegramMessage(input: {
  token: string
  chatId: string | number
  text: string
}): Promise<void> {
  await callTelegram(input.token, 'sendMessage', {
    chat_id: input.chatId,
    text: input.text,
  })
}

export async function downloadTelegramFile(input: {
  token: string
  fileId: string
}): Promise<{ bytes: Uint8Array; filePath: string; contentType: string }> {
  const file = await callTelegram<{ file_path?: string }>(
    input.token,
    'getFile',
    { file_id: input.fileId },
  )
  if (!file.file_path) throw new Error('Telegram did not return a file path')

  const response = await fetch(
    `https://api.telegram.org/file/bot${input.token}/${file.file_path}`,
  )
  if (!response.ok) throw new Error('Telegram file download failed')

  return {
    bytes: new Uint8Array(await response.arrayBuffer()),
    filePath: file.file_path,
    contentType:
      response.headers.get('content-type') ?? 'application/octet-stream',
  }
}
