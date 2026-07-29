import { describe, expect, it } from 'vitest'
import { checkRateLimit, getClientIp } from './rate-limit'

describe('checkRateLimit', () => {
  it('allows requests under the limit', () => {
    const res1 = checkRateLimit({
      key: 'test-limit',
      identifier: 'user1',
      limit: 2,
      windowMs: 60000,
    })
    expect(res1.success).toBe(true)
    expect(res1.remaining).toBe(1)

    const res2 = checkRateLimit({
      key: 'test-limit',
      identifier: 'user1',
      limit: 2,
      windowMs: 60000,
    })
    expect(res2.success).toBe(true)
    expect(res2.remaining).toBe(0)
  })

  it('rejects requests over the limit', () => {
    const key = 'test-limit-over'
    const identifier = 'user2'
    checkRateLimit({ key, identifier, limit: 1, windowMs: 60000 })

    const res = checkRateLimit({ key, identifier, limit: 1, windowMs: 60000 })
    expect(res.success).toBe(false)
    expect(res.remaining).toBe(0)
    expect(res.resetMs).toBeGreaterThan(0)
  })
})

describe('getClientIp', () => {
  it('extracts IP from x-forwarded-for', () => {
    const headers = new Headers({
      'x-forwarded-for': '203.0.113.195, 70.41.3.18',
    })
    expect(getClientIp(headers)).toBe('203.0.113.195')
  })

  it('falls back to 127.0.0.1 if missing', () => {
    const headers = new Headers()
    expect(getClientIp(headers)).toBe('127.0.0.1')
  })
})
