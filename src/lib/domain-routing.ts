export type AppSubdomain = 'app' | 'operator' | 'portal'

const APP_SUBDOMAINS = [
  'app',
  'operator',
  'portal',
] as const satisfies readonly AppSubdomain[]

function hasPathPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`)
}

function getActiveSubdomain(hostname: string): AppSubdomain | null {
  const firstLabel = hostname.split('.')[0]
  return APP_SUBDOMAINS.find((value) => value === firstLabel) ?? null
}

function getBaseHostname(hostname: string): string {
  const activeSubdomain = getActiveSubdomain(hostname)
  if (!activeSubdomain) return hostname
  return hostname.slice(activeSubdomain.length + 1) || hostname
}

function setSubdomain(url: URL, subdomain: AppSubdomain): void {
  url.hostname = `${subdomain}.${getBaseHostname(url.hostname)}`
}

function stripInternalPrefix(pathname: string, prefix: string): string {
  const stripped = pathname.slice(prefix.length)
  return stripped.length > 0 ? stripped : '/'
}

function shouldBypassSubdomainRewrite(pathname: string): boolean {
  if (pathname === '/sign-in' || pathname.startsWith('/sign-in/')) return true
  if (pathname === '/sign-up' || pathname.startsWith('/sign-up/')) return true
  if (pathname === '/onboarding' || pathname.startsWith('/onboarding/'))
    return true
  if (pathname === '/forbidden' || pathname.startsWith('/forbidden/'))
    return true
  if (pathname === '/invite' || pathname.startsWith('/invite/')) return true
  if (pathname === '/api' || pathname.startsWith('/api/')) return true
  return pathname.split('/').some((segment) => segment.includes('.'))
}

export function rewriteAppUrlInput(url: URL): URL {
  const activeSubdomain = getActiveSubdomain(url.hostname)

  if (!activeSubdomain || shouldBypassSubdomainRewrite(url.pathname)) {
    return url
  }

  if (
    activeSubdomain === 'operator' &&
    !hasPathPrefix(url.pathname, '/operator')
  ) {
    url.pathname =
      url.pathname === '/' ? '/operator' : `/operator${url.pathname}`
  }

  if (activeSubdomain === 'portal' && !hasPathPrefix(url.pathname, '/order')) {
    url.pathname = url.pathname === '/' ? '/order' : `/order${url.pathname}`
  }

  return url
}

export function rewriteAppUrlOutput(url: URL): URL {
  if (hasPathPrefix(url.pathname, '/operator')) {
    setSubdomain(url, 'operator')
    url.pathname = stripInternalPrefix(url.pathname, '/operator')
    return url
  }

  if (hasPathPrefix(url.pathname, '/order')) {
    setSubdomain(url, 'portal')
    url.pathname = stripInternalPrefix(url.pathname, '/order')
  }

  return url
}

export function buildPortalUrl(
  token: string,
  origin = typeof window === 'undefined'
    ? 'http://localhost'
    : window.location.origin,
): string {
  const url = new URL(`/order/${token}`, origin)
  return rewriteAppUrlOutput(url).toString()
}
