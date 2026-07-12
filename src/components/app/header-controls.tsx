'use client'

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
import { switchLocale } from '#/components/app/header-controls-utils'

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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <Languages className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => switchLocale('en')}>
          {locale === 'en' ? (
            <CheckIcon className="size-4" />
          ) : (
            <span className="size-4" />
          )}
          {t('english')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => switchLocale('id')}>
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
