import { createIsomorphicFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { defaultLocale, LOCALE_KEY, parseLocaleCookie } from './i18n'

export const getCurrentLocale = createIsomorphicFn()
  .server(() => {
    const request = getRequest()
    return parseLocaleCookie(request.headers.get('cookie')) ?? defaultLocale
  })
  .client(() => {
    const stored = localStorage.getItem(LOCALE_KEY)
    if (stored) return stored
    const fromCookie = parseLocaleCookie(document.cookie)
    if (fromCookie) return fromCookie
    return defaultLocale
  })
