'use client'

import Cookies from 'js-cookie'
import { CheckIcon, Languages, Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useLocale, useTranslations } from 'use-intl'

import { Button } from '#/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import { defaultLocale, LOCALE_COOKIE, stripLocale } from '#/lib/i18n'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
    >
      <Sun className="size-4 rotate-0 scale-100 transition-transform dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute size-4 rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100" />
    </Button>
  )
}

export function LanguageToggle() {
  const t = useTranslations('app')
  const locale = useLocale()

  const switchTo = (targetLocale: string) => {
    const url = new URL(window.location.href)
    const basePath = stripLocale(url.pathname)

    if (targetLocale === defaultLocale) {
      url.pathname = basePath
    } else {
      url.pathname = `/${targetLocale}${basePath === '/' ? '' : basePath}`
    }

    Cookies.set(LOCALE_COOKIE, targetLocale, { path: '/', expires: 365 })
    window.location.assign(url.toString())
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <Languages className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => switchTo('en')}>
          {locale === 'en' ? (
            <CheckIcon className="size-4" />
          ) : (
            <span className="size-4" />
          )}
          {t('english')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => switchTo('id')}>
          {locale === 'id' ? (
            <CheckIcon className="size-4" />
          ) : (
            <span className="size-4" />
          )}
          {t('indonesian')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
