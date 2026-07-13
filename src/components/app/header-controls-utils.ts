import Cookies from 'js-cookie'

import { LOCALE_KEY } from '#/lib/i18n'

export function switchLocale(targetLocale: string) {
  localStorage.setItem(LOCALE_KEY, targetLocale)
  Cookies.set(LOCALE_KEY, targetLocale, { path: '/', expires: 365 })
  window.location.reload()
}
