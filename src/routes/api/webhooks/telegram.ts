import { randomUUID } from 'node:crypto'
import { RequestContext } from '@mastra/core/request-context'
import { createFileRoute } from '@tanstack/react-router'
import { and, eq } from 'drizzle-orm'
import { db } from '#/db/index'
import {
  channelAccesses,
  connectedChannels,
  messagingIdentities,
  telegramProcessedUpdates,
} from '#/db/schema'
import {
  decryptTelegramBotToken,
  downloadTelegramFile,
  sendTelegramMessage as sendTelegramMessageUnsafe,
} from '#/lib/telegram'
import { messages } from '#/messages'

// ── Telegram Bot API types ────────────────────────────────────────

type TelegramPhotoSize = {
  file_id: string
  file_unique_id: string
  width: number
  height: number
  file_size: number
}

type TelegramUpdate = {
  update_id: number
  message?: {
    message_id: number
    from?: {
      id: number
      is_bot: boolean
      first_name: string
      last_name?: string
      username?: string
      language_code?: string
    }
    chat: { id: number; type: string }
    date: number
    text?: string
    caption?: string
    photo?: TelegramPhotoSize[]
  }
}

// ── Helpers ───────────────────────────────────────────────────────

function pickLargestPhoto(
  photo: TelegramPhotoSize[] | undefined,
): TelegramPhotoSize | null {
  if (!photo || photo.length === 0) return null
  return photo.reduce((largest, current) =>
    current.file_size > largest.file_size ? current : largest,
  )
}

function isUniqueViolation(err: unknown): boolean {
  if (!(err instanceof Error) || !('code' in err)) return false
  const code = (err as { code: unknown }).code
  return code === '23505'
}

function replyText(
  locale: 'en' | 'id',
  key: keyof (typeof messages)['en']['channels']['telegramReplies'],
): string {
  return messages[locale].channels.telegramReplies[key]
}

async function replyToTelegram(input: {
  token: string
  chatId: string | number
  text: string
}): Promise<void> {
  try {
    await sendTelegramMessageUnsafe(input)
  } catch (error) {
    console.error('[telegram] failed to send reply:', error)
  }
}
async function recordProcessedUpdate(
  channel: typeof connectedChannels.$inferSelect,
  updateIdKey: string | null,
): Promise<void> {
  if (!updateIdKey) return
  try {
    await db.insert(telegramProcessedUpdates).values({
      id: randomUUID(),
      orgId: channel.orgId,
      connectedChannelId: channel.id,
      updateId: updateIdKey,
    })
  } catch (err) {
    if (isUniqueViolation(err)) return
    console.error('[telegram] failed to record processed update:', err)
  }
}

// ── Core handler (exported for test seam) ─────────────────────────

export async function handleTelegramWebhook(
  request: Request,
): Promise<Response> {
  const webhookSecret = request.headers.get('X-Telegram-Bot-Api-Secret-Token')
  if (!webhookSecret) {
    return Response.json({ ok: false }, { status: 401 })
  }

  // Authenticate: find connected channel by webhook secret
  const [channel] = await db
    .select()
    .from(connectedChannels)
    .where(
      and(
        eq(connectedChannels.webhookSecret, webhookSecret),
        eq(connectedChannels.status, 'connected'),
      ),
    )
    .limit(1)
  if (!channel) {
    return Response.json({ ok: false }, { status: 401 })
  }

  // Decrypt bot token — credential failure is a server error
  let botToken: string
  try {
    botToken = decryptTelegramBotToken(channel.botToken)
  } catch (error) {
    console.error(
      '[telegram] could not decrypt connected channel credential:',
      error,
    )
    return Response.json({ ok: false }, { status: 500 })
  }

  // Parse update body
  let update: TelegramUpdate
  try {
    update = (await request.json()) as TelegramUpdate
  } catch {
    return Response.json({ ok: true })
  }

  // Idempotency: skip if already processed
  const updateIdKey =
    update.update_id === undefined ? null : String(update.update_id)
  if (updateIdKey) {
    const [existing] = await db
      .select({ id: telegramProcessedUpdates.id })
      .from(telegramProcessedUpdates)
      .where(
        and(
          eq(telegramProcessedUpdates.connectedChannelId, channel.id),
          eq(telegramProcessedUpdates.updateId, updateIdKey),
        ),
      )
      .limit(1)
    if (existing) return Response.json({ ok: true })
  }

  // Filter: only private-chat messages from non-bots
  const message = update.message
  const chatId = message?.chat?.id
  const from = message?.from
  if (
    !message ||
    !chatId ||
    message.chat?.type !== 'private' ||
    !from?.id ||
    from.is_bot
  ) {
    return Response.json({ ok: true })
  }

  const locale = from.language_code === 'id' ? 'id' : 'en'

  // ── Upsert messaging identity ─────────────────────────────────

  const providerUserId = String(from.id)
  const displayName =
    [from.first_name, from.last_name].filter(Boolean).join(' ') ||
    providerUserId
  const now = new Date()

  const [storedIdentity] = await db
    .select()
    .from(messagingIdentities)
    .where(
      and(
        eq(messagingIdentities.channelType, 'telegram'),
        eq(messagingIdentities.providerUserId, providerUserId),
      ),
    )
    .limit(1)

  const identity = storedIdentity ?? {
    id: randomUUID(),
    channelType: 'telegram' as const,
    providerUserId,
    displayName,
    username: from.username ?? null,
    createdAt: now,
    updatedAt: now,
  }

  if (storedIdentity) {
    await db
      .update(messagingIdentities)
      .set({
        displayName,
        username: from.username ?? null,
        updatedAt: now,
      })
      .where(eq(messagingIdentities.id, storedIdentity.id))
  } else {
    await db.insert(messagingIdentities).values(identity)
  }

  // ── Check channel access ──────────────────────────────────────

  const [access] = await db
    .select()
    .from(channelAccesses)
    .where(
      and(
        eq(channelAccesses.connectedChannelId, channel.id),
        eq(channelAccesses.messagingIdentityId, identity.id),
      ),
    )
    .limit(1)

  const command = message.text?.trim().toLowerCase()

  // ── /start lifecycle ──────────────────────────────────────────

  if (command === '/start') {
    if (!access) {
      await db.insert(channelAccesses).values({
        id: randomUUID(),
        orgId: channel.orgId,
        connectedChannelId: channel.id,
        messagingIdentityId: identity.id,
        status: 'pending',
        requestedAt: now,
        startedConnectionVersion: channel.connectionVersion,
        startedAt: now,
        createdAt: now,
        updatedAt: now,
      })
      await replyToTelegram({
        token: botToken,
        chatId,
        text: replyText(locale, 'requestSent'),
      })
    } else if (access.status === 'pending') {
      await db
        .update(channelAccesses)
        .set({
          requestedAt: now,
          startedConnectionVersion: channel.connectionVersion,
          startedAt: now,
          updatedAt: now,
        })
        .where(eq(channelAccesses.id, access.id))
      await replyToTelegram({
        token: botToken,
        chatId,
        text: replyText(locale, 'stillPending'),
      })
    } else if (access.status === 'revoked') {
      await replyToTelegram({
        token: botToken,
        chatId,
        text: replyText(locale, 'revoked'),
      })
    } else {
      // approved — refresh connection version stamp
      await db
        .update(channelAccesses)
        .set({
          startedConnectionVersion: channel.connectionVersion,
          startedAt: now,
          updatedAt: now,
        })
        .where(eq(channelAccesses.id, access.id))
      await replyToTelegram({
        token: botToken,
        chatId,
        text: replyText(locale, 'welcome'),
      })
    }
    await recordProcessedUpdate(channel, updateIdKey)
    return Response.json({ ok: true })
  }

  // ── Access gate for non-/start messages ───────────────────────

  if (!access) {
    await replyToTelegram({
      token: botToken,
      chatId,
      text: replyText(locale, 'startRequired'),
    })
    await recordProcessedUpdate(channel, updateIdKey)
    return Response.json({ ok: true })
  }
  if (access.status === 'pending') {
    await replyToTelegram({
      token: botToken,
      chatId,
      text: replyText(locale, 'stillPending'),
    })
    await recordProcessedUpdate(channel, updateIdKey)
    return Response.json({ ok: true })
  }
  if (access.status === 'revoked') {
    await replyToTelegram({
      token: botToken,
      chatId,
      text: replyText(locale, 'revoked'),
    })
    await recordProcessedUpdate(channel, updateIdKey)
    return Response.json({ ok: true })
  }
  if (access.startedConnectionVersion !== channel.connectionVersion) {
    await replyToTelegram({
      token: botToken,
      chatId,
      text: replyText(locale, 'replaced'),
    })
    await recordProcessedUpdate(channel, updateIdKey)
    return Response.json({ ok: true })
  }

  // ── Route approved message to Mastra agent ────────────────────

  const photo = pickLargestPhoto(message.photo)
  const userText = message.text?.trim() ?? message.caption?.trim()
  if (!userText && !photo) return Response.json({ ok: true })

  // Download photo if present (no persistence — bytes passed directly)
  let attachmentImage: { bytes: Uint8Array; contentType: string } | undefined
  if (photo) {
    try {
      const downloaded = await downloadTelegramFile({
        token: botToken,
        fileId: photo.file_id,
      })
      attachmentImage = {
        bytes: downloaded.bytes,
        contentType: downloaded.contentType,
      }
    } catch {
      await replyToTelegram({
        token: botToken,
        chatId,
        text: replyText(locale, 'photoDownloadFailed'),
      })
      await recordProcessedUpdate(channel, updateIdKey)
      return Response.json({ ok: true })
    }
  }

  // Build RequestContext — orgId comes ONLY from verified channel row
  const requestContext = new RequestContext<{
    orgId: string
    userId: string
    role: 'admin'
  }>()
  requestContext.set('orgId', channel.orgId)
  requestContext.set('userId', `telegram:${identity.id}`)
  requestContext.set('role', 'admin')

  const { mastra } = await import('#/mastra')
  const agent = mastra.getAgentById('business-assistant')
  const memoryScope = `telegram:${channel.id}:${identity.id}`

  const prompt = userText ?? ''
  const context = attachmentImage
    ? [
        {
          role: 'user' as const,
          content: [
            {
              type: 'image' as const,
              image: attachmentImage.bytes,
              mediaType: attachmentImage.contentType,
            },
          ],
        },
      ]
    : undefined

  try {
    const result = await agent.generate(prompt, {
      memory: { thread: memoryScope, resource: memoryScope },
      context,
      requestContext,
    })
    await replyToTelegram({
      token: botToken,
      chatId,
      text: result.text,
    })
  } catch (error) {
    console.error('[telegram] agent error:', error)
    await replyToTelegram({
      token: botToken,
      chatId,
      text: replyText(locale, 'processingFailed'),
    })
  }
  await recordProcessedUpdate(channel, updateIdKey)

  return Response.json({ ok: true })
}

// ── TanStack Start route ──────────────────────────────────────────

export const Route = createFileRoute('/api/webhooks/telegram')({
  server: {
    handlers: {
      POST: async ({ request }) => handleTelegramWebhook(request),
    },
  },
})
