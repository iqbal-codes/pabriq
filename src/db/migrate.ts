import crypto from 'node:crypto'
import fs from 'node:fs'
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
    // Check if "account" table exists in public schema
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'account'
      );
    `)
    const accountTableExists = tableCheck.rows[0]?.exists === true

    // Check if drizzle.__drizzle_migrations table exists and has rows
    let migrationsTableExists = false
    let migrationsCount = 0
    try {
      const migrationsCheck = await pool.query(
        'SELECT count(*) FROM drizzle.__drizzle_migrations',
      )
      migrationsTableExists = true
      migrationsCount = parseInt(migrationsCheck.rows[0]?.count || '0', 10)
    } catch {
      migrationsTableExists = false
    }

    // Baseline if we have tables but no migrations history
    if (
      accountTableExists &&
      (!migrationsTableExists || migrationsCount === 0)
    ) {
      console.log(
        'Existing database schema detected without migration history. Baselining...',
      )

      // Create drizzle schema and migrations table if not exists
      await pool.query('CREATE SCHEMA IF NOT EXISTS drizzle')
      await pool.query(`
        CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
          id SERIAL PRIMARY KEY,
          hash text NOT NULL,
          created_at bigint
        )
      `)

      // Read journal and insert all migrations as applied
      const journalContent = fs.readFileSync(
        './drizzle/meta/_journal.json',
        'utf-8',
      )
      const journal = JSON.parse(journalContent)

      for (const entry of journal.entries) {
        const sqlContent = fs.readFileSync(
          `./drizzle/${entry.tag}.sql`,
          'utf-8',
        )
        const hash = crypto
          .createHash('sha256')
          .update(sqlContent)
          .digest('hex')

        await pool.query(
          `INSERT INTO drizzle.__drizzle_migrations (hash, created_at) 
           VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [hash, entry.when],
        )
        console.log(`Baselined migration: ${entry.tag}`)
      }
      console.log('Baselining completed successfully!')
    }
  } catch (baselineError) {
    console.error(
      'Migration baselining failed, continuing with default migrator:',
      baselineError,
    )
  }

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
