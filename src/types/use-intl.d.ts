import type { Locale } from '#/messages'
import type en from '#/messages/en'

declare module 'use-intl' {
  interface AppConfig {
    Locale: Locale
    Messages: typeof en
  }
}
