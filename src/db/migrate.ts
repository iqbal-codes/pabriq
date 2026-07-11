import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Pool } from 'pg'
import { normalizePostgresConnectionString } from './connection-string'

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  console.error(
    'DATABASE_URL environment variable is required to run migrations.',
  )
  process.exit(1)
}

const pool = new Pool({
  connectionString: normalizePostgresConnectionString(databaseUrl),
  max: 1, // Only need one connection for migrations
})

const db = drizzle(pool)

async function runMigrations() {
  console.log('Running database migrations...')
  try {
    await migrate(db, { migrationsFolder: './drizzle' })
    console.log('Database migrations completed successfully.')
    process.exit(0)
  } catch (err) {
    console.error('Database migration failed:', err)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

runMigrations()
