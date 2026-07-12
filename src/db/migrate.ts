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

async function checkMigrationStatementsApplied(
  pool: Pool,
  sqlContent: string,
): Promise<boolean> {
  const statements = sqlContent
    .split('--> statement-breakpoint')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)

  for (const stmt of statements) {
    // 1. Match CREATE TABLE "table_name"
    const createTableMatch = stmt.match(
      /CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+"([^"]+)"/i,
    )
    if (createTableMatch) {
      const tableName = createTableMatch[1]
      const res = await pool.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        );`,
        [tableName],
      )
      if (res.rows[0]?.exists !== true) {
        return false
      }
    }

    // 2. Match ALTER TABLE "table_name" ADD COLUMN "column_name" or ADD "column_name"
    const addColumnMatch = stmt.match(
      /ALTER\s+TABLE\s+"([^"]+)"\s+ADD\s+(?:COLUMN\s+)?"([^"]+)"/i,
    )
    if (addColumnMatch) {
      const tableName = addColumnMatch[1]
      const columnName = addColumnMatch[2]
      const res = await pool.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = $1
          AND column_name = $2
        );`,
        [tableName, columnName],
      )
      if (res.rows[0]?.exists !== true) {
        return false
      }
    }
  }

  return true
}

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

    // Baseline if we have tables
    if (accountTableExists) {
      console.log(
        'Existing database schema detected. Baselining and reconciling migrations...',
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

      // Query currently recorded migrations from database
      const existingDbRes = await pool.query(
        'SELECT hash FROM drizzle.__drizzle_migrations',
      )
      const existingHashes = new Set<string>()
      for (const row of existingDbRes.rows) {
        existingHashes.add(row.hash)
      }

      // Read journal
      const journalContent = fs.readFileSync(
        './drizzle/meta/_journal.json',
        'utf-8',
      )
      const journal = JSON.parse(journalContent)

      let stopBaselining = false

      for (const entry of journal.entries) {
        const sqlContent = fs.readFileSync(
          `./drizzle/${entry.tag}.sql`,
          'utf-8',
        )
        const hash = crypto
          .createHash('sha256')
          .update(sqlContent)
          .digest('hex')

        let isApplied = false
        if (!stopBaselining) {
          isApplied = await checkMigrationStatementsApplied(pool, sqlContent)
          if (!isApplied) {
            stopBaselining = true
          }
        }

        if (isApplied) {
          if (!existingHashes.has(hash)) {
            await pool.query(
              `INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2)`,
              [hash, entry.when],
            )
            console.log(`Baselined migration (marked applied): ${entry.tag}`)
          }
        } else {
          // Reconcile/heal: if it is recorded but not actually applied, remove it
          if (existingHashes.has(hash)) {
            await pool.query(
              `DELETE FROM drizzle.__drizzle_migrations WHERE hash = $1`,
              [hash],
            )
            console.log(
              `Removed baseline entry for unapplied migration (will run): ${entry.tag}`,
            )
          }
        }
      }
      console.log('Migration reconciliation completed successfully!')
    }
  } catch (baselineError) {
    console.error(
      'Migration baselining/reconciliation failed, continuing with default migrator:',
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
