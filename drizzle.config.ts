import { config } from 'dotenv'
import { defineConfig } from 'drizzle-kit'

config({ path: ['.env.local', '.env'] })

if (!process.env.DATABASE_URL) {
  console.warn(
    '\n  DATABASE_URL not set — drizzle-kit requires a real Postgres instance.\n' +
      '  Set DATABASE_URL in .env.local to use drizzle-kit.\n',
  )
}

export default defineConfig({
  out: './drizzle',
  schema: './src/db/schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? '',
  },
})
