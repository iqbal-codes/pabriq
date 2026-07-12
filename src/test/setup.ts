import { config } from 'dotenv'
import '@testing-library/jest-dom/vitest'
import '@testing-library/react'

config({ path: '.env.test', override: true })

// SAFETY: Prevent tests from running against production databases
const DATABASE_URL = process.env.DATABASE_URL ?? ''

if (!DATABASE_URL) {
  console.error('\n❌ DATABASE_URL is not set!')
  console.error(
    '   Add the test database URL to .env.test, then use `bun run test`.\n',
  )
  process.exit(1)
}

// `bun run test` sets NODE_ENV=test and loads `.env.test` before Vitest starts.
if (process.env.NODE_ENV !== 'test') {
  console.error('\n❌ SAFETY ABORT: Tests must run via `bun run test`!')
  console.error('   This ensures .env.test supplies the test database.\n')
  process.exit(1)
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
