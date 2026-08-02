import { describe, expect, it } from 'vitest'
import { buildPortalUrl } from './domain-routing'

describe('buildPortalUrl', () => {
  it('builds portal path URL for given token and origin', () => {
    const result = buildPortalUrl('abc-123', 'http://example.com')
    expect(result).toBe('http://example.com/portal/abc-123')
  })

  it('preserves port from origin', () => {
    const result = buildPortalUrl('token-1', 'http://localhost:3000')
    expect(result).toBe('http://localhost:3000/portal/token-1')
  })

  it('preserves https scheme', () => {
    const result = buildPortalUrl('tok', 'https://example.com')
    expect(result).toBe('https://example.com/portal/tok')
  })

  it('keeps subdomain origin intact (tenant slugs stay as subdomains)', () => {
    const result = buildPortalUrl('tok', 'https://acme.example.com')
    expect(result).toBe('https://acme.example.com/portal/tok')
  })
})
