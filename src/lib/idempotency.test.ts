import { describe, expect, it } from 'vitest'
import { withIdempotency } from './idempotency'

describe('withIdempotency', () => {
  it('executes function normally when no key is provided', async () => {
    let count = 0
    const fn = async () => ++count
    const r1 = await withIdempotency(null, fn)
    const r2 = await withIdempotency(undefined, fn)
    expect(r1).toBe(1)
    expect(r2).toBe(2)
  })

  it('deduplicates calls with the same key', async () => {
    let count = 0
    const fn = async () => ({ ok: true, count: ++count })

    const r1 = await withIdempotency('key-123', fn)
    const r2 = await withIdempotency('key-123', fn)

    expect(r1).toEqual({ ok: true, count: 1 })
    expect(r2).toEqual({ ok: true, count: 1 })
  })
})
