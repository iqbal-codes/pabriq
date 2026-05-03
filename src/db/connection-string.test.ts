import { describe, expect, it } from 'vitest'
import { normalizePostgresConnectionString } from './connection-string'

describe('normalizePostgresConnectionString', () => {
  it('keeps current pg SSL verification behavior explicit', () => {
    expect(
      normalizePostgresConnectionString(
        'postgres://user:pass@example.com/app?sslmode=require&channel_binding=require',
      ),
    ).toBe(
      'postgres://user:pass@example.com/app?sslmode=verify-full&channel_binding=require',
    )
  })

  it('leaves explicit verify-full URLs unchanged', () => {
    const connectionString =
      'postgres://user:pass@example.com/app?sslmode=verify-full'

    expect(normalizePostgresConnectionString(connectionString)).toBe(
      connectionString,
    )
  })
})
