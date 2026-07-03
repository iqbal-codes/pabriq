import { config } from 'dotenv'
import '@testing-library/jest-dom/vitest'
import '@testing-library/react'

config({ path: '.env.test' })

// SAFETY: Prevent tests from running against production databases
const DATABASE_URL = process.env.DATABASE_URL ?? ''

if (!DATABASE_URL) {
  console.error(
    '\n❌ DATABASE_URL is not set!',
  )
  console.error(
    '   Use `bun run test` (which uses load-env-test) or create .env.test with DATABASE_URL.\n',
  )
  process.exit(1)
}

// Check if we're running via `bun run test` (which sets NODE_ENV or has Infisical markers)
// The load-env-test script uses Infisical staging environment
const isRunningViaProjectScript = process.env.INFISICAL_ENVIRONMENT === 'staging' || 
                                   process.env.NODE_ENV === 'test'

if (!isRunningViaProjectScript) {
  console.warn(
    '\n⚠️  WARNING: Tests are not running via `bun run test`!',
  )
  console.warn(
    '   This may cause tests to run against the wrong database.',
  )
  console.warn(
    '   Use `bun run test` to ensure correct environment.\n',
  )
  // Don't exit, just warn - the TRUNCATE operations will still work but against potentially wrong DB
}

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
})
