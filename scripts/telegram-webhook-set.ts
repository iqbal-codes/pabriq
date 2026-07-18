import { and, eq } from 'drizzle-orm'
import { db } from '#/db/index'
import { connectedChannels } from '#/db/schema'
import { decryptTelegramBotToken, setTelegramWebhook } from '#/lib/telegram'

type Args = {
  botId?: string
  secret?: string
  isHelp: boolean
}

function parseArgs(argv: string[]): Args {
  const args: Args = { isHelp: false }
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]
    if (argument === '--bot-id' || argument === '-b') {
      args.botId = argv[index + 1]
      index += 1
    } else if (argument === '--secret' || argument === '-s') {
      args.secret = argv[index + 1]
      index += 1
    } else if (argument === '--help' || argument === '-h') {
      args.isHelp = true
    }
  }
  return args
}

function printHelp(): void {
  console.log(`Usage:
  bun run telegram:webhook:set -- --bot-id <telegram-bot-id> [--secret <secret>]

Environment:
  DATABASE_URL                       PostgreSQL connection string
  TELEGRAM_WEBHOOK_BASE_URL          Public application origin
  TELEGRAM_TOKEN_ENCRYPTION_KEY      Key used to decrypt the stored bot token

Flags:
  --bot-id, -b    Telegram bot id from connected_channels
  --secret, -s    Rotate the Telegram webhook secret token
  --help, -h      Print this help`)
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))
  if (args.isHelp) {
    printHelp()
    return
  }
  if (!args.botId) throw new Error('--bot-id is required')

  const baseUrl = process.env.TELEGRAM_WEBHOOK_BASE_URL
  if (!baseUrl) throw new Error('TELEGRAM_WEBHOOK_BASE_URL is required')

  const encryptionKey = process.env.TELEGRAM_TOKEN_ENCRYPTION_KEY
  if (!encryptionKey) {
    throw new Error('TELEGRAM_TOKEN_ENCRYPTION_KEY is required')
  }

  const [channel] = await db
    .select()
    .from(connectedChannels)
    .where(
      and(
        eq(connectedChannels.telegramBotId, args.botId),
        eq(connectedChannels.status, 'connected'),
      ),
    )
    .limit(1)
  if (!channel) throw new Error('Connected Telegram channel was not found')

  const token = decryptTelegramBotToken(channel.botToken)
  const secret = args.secret ?? channel.webhookSecret
  const url = new URL('/api/webhooks/telegram', baseUrl).toString()
  const isRotatingSecret = secret !== channel.webhookSecret

  if (isRotatingSecret) {
    await db
      .update(connectedChannels)
      .set({ webhookSecret: secret, updatedAt: new Date() })
      .where(eq(connectedChannels.id, channel.id))
  }

  try {
    await setTelegramWebhook({ token, url, secretToken: secret })
  } catch (error) {
    if (isRotatingSecret) {
      await db
        .update(connectedChannels)
        .set({ webhookSecret: channel.webhookSecret, updatedAt: new Date() })
        .where(eq(connectedChannels.id, channel.id))
    }
    throw error
  }

  console.log(
    `Registered Telegram webhook for @${channel.telegramBotUsername ?? channel.telegramBotName}: ${url}`,
  )
}

main().catch((error: unknown) => {
  console.error(
    '[telegram:webhook:set] failed:',
    error instanceof Error ? error.message : error,
  )
  process.exitCode = 1
})
