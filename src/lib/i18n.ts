import { defaultLocale } from '#/messages'

export { defaultLocale }

export const LOCALE_KEY = 'locale'

export function parseLocaleCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null
  const match = cookieHeader.match(new RegExp(`${LOCALE_KEY}=([^;]+)`))
  return match?.[1] ?? null
}
