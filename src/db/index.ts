import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { normalizePostgresConnectionString } from './connection-string'
import * as schema from './schema'

const MissingDatabaseUrlError = () =>
  new Error(
    'DATABASE_URL is required. Set it in .env.local for dev or .env.test for tests.',
  )

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) throw MissingDatabaseUrlError()

const pool = new Pool({
  connectionString: normalizePostgresConnectionString(databaseUrl),
  connectionTimeoutMillis: 10000,
})

try {
  const client = await pool.connect()
  client.release()
} catch (cause) {
  await pool.end().catch(() => {})
  throw new Error(
    `Failed to connect to PostgreSQL at ${databaseUrl.replace(/:.+@/, ':****@')}`,
    { cause },
  )
}

export const db = drizzle(pool, { schema })

export async function checkDatabaseHealth(): Promise<void> {
  await pool.query('SELECT 1')
}
