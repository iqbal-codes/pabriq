/**
 * Domain routing helpers.
 *
 * Operator and portal surfaces are served as plain paths (`/operator`,
 * `/portal/<token>`) under the app's own hostname. Subdomains are reserved
 * for tenant slugs, so no hostname rewriting happens here.
 */

export function buildPortalUrl(
  token: string,
  origin = typeof window === 'undefined'
    ? 'http://localhost'
    : window.location.origin,
): string {
  return new URL(`/portal/${token}`, origin).toString()
}
