import type { Messages } from './en'
import en from './en'
import id from './id'

export type { Messages }
export const messages: Record<string, Messages> = { en, id }
export const defaultLocale = 'id'
export const supportedLocales = ['en', 'id'] as const
export type Locale = (typeof supportedLocales)[number]

export function isValidLocale(locale: string): locale is Locale {
  return supportedLocales.includes(locale as Locale)
}
