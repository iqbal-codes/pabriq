import en from './en'
import id from './id'
import type { Messages } from './types'

export type { Messages }
export const messages: Record<string, Messages> = { en, id }
export const defaultLocale = 'id'
const supportedLocales = ['en', 'id'] as const
export type Locale = (typeof supportedLocales)[number]
