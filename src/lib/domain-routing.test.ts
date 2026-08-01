import { describe, expect, it } from 'vitest'
import {
  buildPortalUrl,
  rewriteAppUrlInput,
  rewriteAppUrlOutput,
} from './domain-routing'

describe('rewriteAppUrlInput', () => {
  it('rewrites operator subdomain root to /operator', () => {
    const url = new URL('http://operator.example.com/')
    rewriteAppUrlInput(url)
    expect(url.pathname).toBe('/operator')
  })

  it('rewrites operator subdomain path to /operator/<path>', () => {
    const url = new URL('http://operator.example.com/orders')
    rewriteAppUrlInput(url)
    expect(url.pathname).toBe('/operator/orders')
  })

  it('does not double-prefix when path already has /operator', () => {
    const url = new URL('http://operator.example.com/operator/orders')
    rewriteAppUrlInput(url)
    expect(url.pathname).toBe('/operator/orders')
  })

  it('rewrites portal subdomain root to /order', () => {
    const url = new URL('http://portal.example.com/')
    rewriteAppUrlInput(url)
    expect(url.pathname).toBe('/order')
  })

  it('rewrites portal subdomain path to /order/<path>', () => {
    const url = new URL('http://portal.example.com/abc-123')
    rewriteAppUrlInput(url)
    expect(url.pathname).toBe('/order/abc-123')
  })

  it('does not double-prefix when path already has /order', () => {
    const url = new URL('http://portal.example.com/order/abc-123')
    rewriteAppUrlInput(url)
    expect(url.pathname).toBe('/order/abc-123')
  })

  it('leaves non-app subdomains untouched', () => {
    const url = new URL('http://www.example.com/dashboard')
    rewriteAppUrlInput(url)
    expect(url.pathname).toBe('/dashboard')
  })

  it('leaves app subdomain path untouched', () => {
    const url = new URL('http://app.example.com/orders')
    rewriteAppUrlInput(url)
    expect(url.pathname).toBe('/orders')
  })

  it('leaves bare hostnames untouched', () => {
    const url = new URL('http://localhost:3000/orders')
    rewriteAppUrlInput(url)
    expect(url.pathname).toBe('/orders')
  })
})

describe('auth callback paths', () => {
  it.each([
    '/forgot-password',
    '/forgot-password/retry',
    '/reset-password',
    '/reset-password/token',
    '/verify-email',
    '/verify-email/status',
  ])('preserves %s on operator and portal subdomains', (pathname) => {
    for (const host of ['operator.example.com', 'portal.example.com']) {
      const url = new URL(`http://${host}${pathname}`)
      rewriteAppUrlInput(url)
      expect(url.pathname).toBe(pathname)
      expect(url.hostname).toBe(host)
    }
  })
})

describe('rewriteAppUrlOutput', () => {
  it('rewrites /operator to operator subdomain', () => {
    const url = new URL('/operator', 'http://example.com')
    rewriteAppUrlOutput(url)
    expect(url.hostname).toBe('operator.example.com')
    expect(url.pathname).toBe('/')
  })

  it('rewrites /operator/orders to operator subdomain with path', () => {
    const url = new URL('/operator/orders', 'http://example.com')
    rewriteAppUrlOutput(url)
    expect(url.hostname).toBe('operator.example.com')
    expect(url.pathname).toBe('/orders')
  })

  it('rewrites /order to portal subdomain', () => {
    const url = new URL('/order', 'http://example.com')
    rewriteAppUrlOutput(url)
    expect(url.hostname).toBe('portal.example.com')
    expect(url.pathname).toBe('/')
  })

  it('rewrites /order/<token> to portal subdomain with token path', () => {
    const url = new URL('/order/abc-123-token', 'http://example.com')
    rewriteAppUrlOutput(url)
    expect(url.hostname).toBe('portal.example.com')
    expect(url.pathname).toBe('/abc-123-token')
  })

  it('leaves non-matching paths untouched', () => {
    const url = new URL('/dashboard', 'http://example.com')
    rewriteAppUrlOutput(url)
    expect(url.hostname).toBe('example.com')
    expect(url.pathname).toBe('/dashboard')
  })

  it('preserves port on subdomain rewrite', () => {
    const url = new URL('/order/abc-123', 'http://localhost:3000')
    rewriteAppUrlOutput(url)
    expect(url.hostname).toBe('portal.localhost')
    expect(url.port).toBe('3000')
    expect(url.pathname).toBe('/abc-123')
  })

  it('preserves port for operator subdomain', () => {
    const url = new URL('/operator', 'http://localhost:3000')
    rewriteAppUrlOutput(url)
    expect(url.hostname).toBe('operator.localhost')
    expect(url.port).toBe('3000')
  })
  it('strips app prefix on portal rewrite', () => {
    const url = new URL('/order/abc-123', 'http://app.example.com')
    rewriteAppUrlOutput(url)
    expect(url.hostname).toBe('portal.example.com')
    expect(url.pathname).toBe('/abc-123')
  })

  it('strips app prefix on operator rewrite', () => {
    const url = new URL('/operator', 'http://app.example.com')
    rewriteAppUrlOutput(url)
    expect(url.hostname).toBe('operator.example.com')
    expect(url.pathname).toBe('/')
  })
})

describe('buildPortalUrl', () => {
  it('builds portal subdomain URL for given token and origin', () => {
    const result = buildPortalUrl('abc-123', 'http://example.com')
    expect(result).toBe('http://portal.example.com/abc-123')
  })

  it('strips /order prefix from the constructed path', () => {
    const result = buildPortalUrl('my-token', 'http://example.com')
    expect(result).toBe('http://portal.example.com/my-token')
    expect(result).not.toContain('/order/')
  })

  it('preserves port from origin', () => {
    const result = buildPortalUrl('token-1', 'http://localhost:3000')
    expect(result).toBe('http://portal.localhost:3000/token-1')
  })

  it('preserves https scheme', () => {
    const result = buildPortalUrl('tok', 'https://example.com')
    expect(result).toBe('https://portal.example.com/tok')
  })

  it('strips app prefix from origin for portal URL', () => {
    const result = buildPortalUrl('tok', 'https://app.example.com')
    expect(result).toBe('https://portal.example.com/tok')
  })

  it('strips app prefix with port from origin', () => {
    const result = buildPortalUrl('tok', 'https://app.example.com:8443')
    expect(result).toBe('https://portal.example.com:8443/tok')
  })
})
