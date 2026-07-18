import { randomBytes } from 'node:crypto'
import { and, desc, eq } from 'drizzle-orm'
import { db } from '#/db/index'
import {
  type ChannelAccessStatus,
  channelAccesses,
  connectedChannels,
  messagingIdentities,
} from '#/db/schema'
import { logger } from '#/lib/logger'
import type { TelegramBotInfo } from '#/lib/telegram'
import {
  decryptTelegramBotToken,
  deleteTelegramWebhook,
  encryptTelegramBotToken,
  getTelegramMe,
  sendTelegramMessage,
  setTelegramWebhook,
} from '#/lib/telegram'
import en from '#/messages/en'

export const CHANNEL_ERROR_CODES = [
  'TELEGRAM_NOT_CONFIGURED',
  'INVALID_BOT_TOKEN',
  'WEBHOOK_REGISTRATION_FAILED',
  'CHANNEL_NOT_FOUND',
  'ACCESS_NOT_FOUND',
  'ACCESS_ALREADY_APPROVED',
  'ACCESS_ALREADY_REVOKED',
] as const

export type ChannelErrorCode = (typeof CHANNEL_ERROR_CODES)[number]

export class ChannelError extends Error {
  readonly code: ChannelErrorCode

  constructor(code: ChannelErrorCode) {
    super(code)
    this.name = 'ChannelError'
    this.code = code
  }
}

export type ConnectedChannelView = {
  id: string
  channelType: 'telegram'
  status: 'connected' | 'disconnected'
  telegramBotId: string
  telegramBotUsername: string | null
  telegramBotName: string
  connectionVersion: number
  connectedAt: Date
  disconnectedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export type ChannelAccessRow = {
  id: string
  status: ChannelAccessStatus
  displayName: string
  username: string | null
  telegramUserId: string
  requestedAt: Date
  approvedAt: Date | null
  revokedAt: Date | null
  startedAt: Date | null
}

type ManagedAccess = {
  access: typeof channelAccesses.$inferSelect
  channel: typeof connectedChannels.$inferSelect
  identity: typeof messagingIdentities.$inferSelect
}

function toConnectedChannelView(
  channel: typeof connectedChannels.$inferSelect,
): ConnectedChannelView {
  return {
    id: channel.id,
    channelType: channel.channelType,
    status: channel.status,
    telegramBotId: channel.telegramBotId,
    telegramBotUsername: channel.telegramBotUsername,
    telegramBotName: channel.telegramBotName,
    connectionVersion: channel.connectionVersion,
    connectedAt: channel.connectedAt,
    disconnectedAt: channel.disconnectedAt,
    createdAt: channel.createdAt,
    updatedAt: channel.updatedAt,
  }
}

function getTelegramWebhookUrl(): string {
  if (
    !process.env.TELEGRAM_TOKEN_ENCRYPTION_KEY ||
    !process.env.TELEGRAM_WEBHOOK_BASE_URL
  ) {
    throw new ChannelError('TELEGRAM_NOT_CONFIGURED')
  }
  return new URL(
    '/api/webhooks/telegram',
    process.env.TELEGRAM_WEBHOOK_BASE_URL,
  ).toString()
}

async function findConnectedChannel(
  orgId: string,
): Promise<typeof connectedChannels.$inferSelect | null> {
  const [channel] = await db
    .select()
    .from(connectedChannels)
    .where(
      and(
        eq(connectedChannels.orgId, orgId),
        eq(connectedChannels.channelType, 'telegram'),
      ),
    )
    .limit(1)
  return channel ?? null
}

async function findManagedAccess(
  orgId: string,
  accessId: string,
): Promise<ManagedAccess> {
  const [row] = await db
    .select({
      access: channelAccesses,
      channel: connectedChannels,
      identity: messagingIdentities,
    })
    .from(channelAccesses)
    .innerJoin(
      connectedChannels,
      eq(channelAccesses.connectedChannelId, connectedChannels.id),
    )
    .innerJoin(
      messagingIdentities,
      eq(channelAccesses.messagingIdentityId, messagingIdentities.id),
    )
    .where(
      and(
        eq(channelAccesses.id, accessId),
        eq(channelAccesses.orgId, orgId),
        eq(connectedChannels.orgId, orgId),
      ),
    )
    .limit(1)
  if (!row) throw new ChannelError('ACCESS_NOT_FOUND')
  return row
}

async function notifyIdentity(input: {
  channel: typeof connectedChannels.$inferSelect
  identity: typeof messagingIdentities.$inferSelect
  text: string
}): Promise<void> {
  try {
    await sendTelegramMessage({
      token: decryptTelegramBotToken(input.channel.botToken),
      chatId: input.identity.providerUserId,
      text: input.text,
    })
  } catch (error) {
    logger.warn(
      { channelId: input.channel.id, identityId: input.identity.id, error },
      'telegram channel access notification failed',
    )
  }
}

export async function getConnectedChannel(
  orgId: string,
): Promise<ConnectedChannelView | null> {
  const channel = await findConnectedChannel(orgId)
  return channel ? toConnectedChannelView(channel) : null
}

export async function listChannelAccesses(
  orgId: string,
  status?: ChannelAccessStatus,
): Promise<ChannelAccessRow[]> {
  const conditions = [
    eq(channelAccesses.orgId, orgId),
    eq(connectedChannels.orgId, orgId),
    eq(connectedChannels.channelType, 'telegram'),
  ]
  if (status) conditions.push(eq(channelAccesses.status, status))

  return db
    .select({
      id: channelAccesses.id,
      status: channelAccesses.status,
      displayName: messagingIdentities.displayName,
      username: messagingIdentities.username,
      telegramUserId: messagingIdentities.providerUserId,
      requestedAt: channelAccesses.requestedAt,
      approvedAt: channelAccesses.approvedAt,
      revokedAt: channelAccesses.revokedAt,
      startedAt: channelAccesses.startedAt,
    })
    .from(channelAccesses)
    .innerJoin(
      connectedChannels,
      eq(channelAccesses.connectedChannelId, connectedChannels.id),
    )
    .innerJoin(
      messagingIdentities,
      eq(channelAccesses.messagingIdentityId, messagingIdentities.id),
    )
    .where(and(...conditions))
    .orderBy(desc(channelAccesses.updatedAt))
}

export async function connectTelegramChannel(
  orgId: string,
  botToken: string,
): Promise<ConnectedChannelView> {
  const webhookUrl = getTelegramWebhookUrl()
  let bot: TelegramBotInfo
  try {
    bot = await getTelegramMe(botToken)
  } catch {
    throw new ChannelError('INVALID_BOT_TOKEN')
  }

  const encryptedToken = encryptTelegramBotToken(botToken)
  const webhookSecret = randomBytes(32).toString('base64url')
  const now = new Date()
  const existing = await findConnectedChannel(orgId)

  if (!existing) {
    const [channel] = await db
      .insert(connectedChannels)
      .values({
        id: crypto.randomUUID(),
        orgId,
        channelType: 'telegram',
        status: 'connected',
        telegramBotId: String(bot.id),
        telegramBotUsername: bot.username ?? null,
        telegramBotName: bot.first_name,
        botToken: encryptedToken,
        webhookSecret,
        connectionVersion: 1,
        connectedAt: now,
        disconnectedAt: null,
        createdAt: now,
        updatedAt: now,
      })
      .returning()
    if (!channel) throw new ChannelError('WEBHOOK_REGISTRATION_FAILED')

    try {
      const isRegistered = await setTelegramWebhook({
        token: botToken,
        url: webhookUrl,
        secretToken: webhookSecret,
      })
      if (!isRegistered) throw new Error('Telegram rejected webhook')
      return toConnectedChannelView(channel)
    } catch {
      await db
        .delete(connectedChannels)
        .where(
          and(
            eq(connectedChannels.id, channel.id),
            eq(connectedChannels.orgId, orgId),
            eq(connectedChannels.webhookSecret, webhookSecret),
          ),
        )
      throw new ChannelError('WEBHOOK_REGISTRATION_FAILED')
    }
  }

  let isReplacement = existing.telegramBotId !== String(bot.id)
  try {
    isReplacement ||= decryptTelegramBotToken(existing.botToken) !== botToken
  } catch {
    isReplacement = true
  }
  const connectionVersion = existing.connectionVersion + (isReplacement ? 1 : 0)

  const [updated] = await db
    .update(connectedChannels)
    .set({
      status: 'connected',
      telegramBotId: String(bot.id),
      telegramBotUsername: bot.username ?? null,
      telegramBotName: bot.first_name,
      botToken: encryptedToken,
      webhookSecret,
      connectionVersion,
      connectedAt: now,
      disconnectedAt: null,
      updatedAt: now,
    })
    .where(
      and(
        eq(connectedChannels.id, existing.id),
        eq(connectedChannels.orgId, orgId),
      ),
    )
    .returning()
  if (!updated) throw new ChannelError('WEBHOOK_REGISTRATION_FAILED')

  try {
    const isRegistered = await setTelegramWebhook({
      token: botToken,
      url: webhookUrl,
      secretToken: webhookSecret,
    })
    if (!isRegistered) throw new Error('Telegram rejected webhook')
  } catch {
    await db
      .update(connectedChannels)
      .set({
        status: existing.status,
        telegramBotId: existing.telegramBotId,
        telegramBotUsername: existing.telegramBotUsername,
        telegramBotName: existing.telegramBotName,
        botToken: existing.botToken,
        webhookSecret: existing.webhookSecret,
        connectionVersion: existing.connectionVersion,
        connectedAt: existing.connectedAt,
        disconnectedAt: existing.disconnectedAt,
        updatedAt: existing.updatedAt,
      })
      .where(
        and(
          eq(connectedChannels.id, existing.id),
          eq(connectedChannels.orgId, orgId),
        ),
      )
    throw new ChannelError('WEBHOOK_REGISTRATION_FAILED')
  }

  if (isReplacement && existing.status === 'connected') {
    try {
      await deleteTelegramWebhook(decryptTelegramBotToken(existing.botToken))
    } catch (error) {
      logger.warn(
        { channelId: existing.id, error },
        'previous telegram webhook cleanup failed',
      )
    }
  }
  return toConnectedChannelView(updated)
}

export async function disconnectTelegramChannel(
  orgId: string,
): Promise<{ id: string; status: 'disconnected' }> {
  const channel = await findConnectedChannel(orgId)
  if (!channel || channel.status === 'disconnected') {
    throw new ChannelError('CHANNEL_NOT_FOUND')
  }

  await db
    .update(connectedChannels)
    .set({
      status: 'disconnected',
      disconnectedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(connectedChannels.id, channel.id),
        eq(connectedChannels.orgId, orgId),
      ),
    )

  try {
    await deleteTelegramWebhook(decryptTelegramBotToken(channel.botToken))
  } catch (error) {
    logger.warn(
      { channelId: channel.id, error },
      'telegram webhook removal failed',
    )
  }
  return { id: channel.id, status: 'disconnected' }
}

export async function approveChannelAccess(
  orgId: string,
  accessId: string,
): Promise<{ id: string; status: 'approved' }> {
  const { access, channel, identity } = await findManagedAccess(orgId, accessId)
  if (access.status === 'approved') {
    throw new ChannelError('ACCESS_ALREADY_APPROVED')
  }

  const now = new Date()
  await db
    .update(channelAccesses)
    .set({
      status: 'approved',
      approvedAt: now,
      revokedAt: null,
      updatedAt: now,
    })
    .where(
      and(eq(channelAccesses.id, access.id), eq(channelAccesses.orgId, orgId)),
    )
  await notifyIdentity({
    channel,
    identity,
    text: en.channels.telegramReplies.approvedNotification,
  })
  return { id: access.id, status: 'approved' }
}

export async function revokeChannelAccess(
  orgId: string,
  accessId: string,
): Promise<{ id: string; status: 'revoked' }> {
  const { access, channel, identity } = await findManagedAccess(orgId, accessId)
  if (access.status === 'revoked') {
    throw new ChannelError('ACCESS_ALREADY_REVOKED')
  }

  const now = new Date()
  await db
    .update(channelAccesses)
    .set({ status: 'revoked', revokedAt: now, updatedAt: now })
    .where(
      and(eq(channelAccesses.id, access.id), eq(channelAccesses.orgId, orgId)),
    )
  await notifyIdentity({
    channel,
    identity,
    text: en.channels.telegramReplies.revokedNotification,
  })
  return { id: access.id, status: 'revoked' }
}
