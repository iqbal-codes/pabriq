import { normalizePostgresConnectionString } from './connection-string'
import * as schema from './schema'

const MissingDatabaseUrlError = () =>
  new Error(
    'DATABASE_URL is required. Set it in .env.local for dev or .env.test for tests.',
  )

export const db = await (async () => {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) throw MissingDatabaseUrlError()

  const { Pool } = await import('pg')
  const pool = new Pool({
    connectionString: normalizePostgresConnectionString(databaseUrl),
    connectionTimeoutMillis: 3000,
  })
  try {
    const client = await pool.connect()
    client.release()
    const { drizzle } = await import('drizzle-orm/node-postgres')
    return drizzle(pool, { schema })
  } catch (cause) {
    await pool.end().catch(() => {})
    throw new Error(
      `Failed to connect to PostgreSQL at ${databaseUrl.replace(/:.+@/, ':****@')}`,
      { cause },
    )
  }
})()
