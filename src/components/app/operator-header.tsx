'use client'

import { useRouter } from '@tanstack/react-router'
import {
  CheckIcon,
  GalleryVerticalEnd,
  Languages,
  LogOut,
  Moon,
  Sun,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { useLocale, useTranslations } from 'use-intl'
import { AssetImage } from '#/components/app/asset-image'
import { switchLocale } from '#/components/app/header-controls'
import { Avatar, AvatarFallback, AvatarImage } from '#/components/ui/avatar'
import { Button } from '#/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import { authClient } from '#/lib/auth-client'

export async function signOutAndNavigate(
  router: ReturnType<typeof useRouter>,
): Promise<void> {
  await authClient.signOut()
  await Promise.all([
    router.invalidate(),
    router.navigate({ to: '/sign-in', search: { redirect: undefined } }),
  ])
}

export function OperatorHeader({
  org,
  user,
}: {
  org: { name: string; slug: string; logo?: string | null } | null
  user: { name: string; email: string; avatar: string }
}) {
  const t = useTranslations('operator')
  const appT = useTranslations('app')
  const adminT = useTranslations('admin')
  const locale = useLocale()
  const { theme, setTheme } = useTheme()
  const router = useRouter()
  const initials = user.name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <header className="flex h-14 shrink-0 items-center border-b bg-background px-4">
      <div className="flex items-center gap-2 min-w-0">
        {org ? (
          <>
            {org.logo ? (
              <AssetImage
                assetId={org.logo}
                assetKind="image"
                interactive={false}
                className="w-8 h-auto rounded-md object-contain"
              />
            ) : (
              <div className="flex size-8 items-center justify-center rounded-md bg-muted">
                <GalleryVerticalEnd className="size-4" />
              </div>
            )}
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-medium truncate">{org.name}</span>
              <span className="text-xs text-muted-foreground truncate">
                {org.slug}
              </span>
            </div>
          </>
        ) : (
          <span className="text-sm font-medium">{t('noOrgHeader')}</span>
        )}
      </div>

      <div className="ml-auto">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative size-8 rounded-full">
              <Avatar className="size-8">
                {user.avatar ? (
                  <AvatarImage src={user.avatar} alt={user.name} />
                ) : null}
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user.name}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Languages className="mr-2 size-4" />
                <span>{appT('language')}</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem onClick={() => switchLocale('en')}>
                  {locale === 'en' ? (
                    <CheckIcon className="size-4" />
                  ) : (
                    <span className="size-4" />
                  )}
                  {appT('english')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => switchLocale('id')}>
                  {locale === 'id' ? (
                    <CheckIcon className="size-4" />
                  ) : (
                    <span className="size-4" />
                  )}
                  {appT('indonesian')}
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuItem
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              {theme === 'dark' ? (
                <Sun className="mr-2 size-4" />
              ) : (
                <Moon className="mr-2 size-4" />
              )}
              {t('theme')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOutAndNavigate(router)}>
              <LogOut className="mr-2 size-4" />
              {adminT('logOut')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
