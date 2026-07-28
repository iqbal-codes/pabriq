import { Link, useLocation } from '@tanstack/react-router'
import { ArrowLeft, ChevronsUpDown, LogOut, Settings2 } from 'lucide-react'
import { useTranslations } from 'use-intl'

import { AvatarPhoto } from '#/components/app/avatar-photo'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '#/components/ui/sidebar'
import { authClient } from '#/lib/auth-client'

export function NavUser({
  user,
  isSettingsSection,
}: {
  user: {
    name: string
    email: string
    avatar: string
  }
  isSettingsSection?: boolean
}) {
  const t = useTranslations('admin')
  const ct = useTranslations('common')
  const st = useTranslations('sidebar')
  const { isMobile } = useSidebar()
  const location = useLocation()
  const inSettings =
    isSettingsSection ?? location.pathname.startsWith('/settings')
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <AvatarPhoto
                assetId={user.avatar || null}
                name={user.name}
                className="size-8 rounded-lg"
              />
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name}</span>
                <span className="truncate text-xs">{user.email}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? 'bottom' : 'right'}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <AvatarPhoto
                  assetId={user.avatar || null}
                  name={user.name}
                  className="size-8 rounded-lg"
                />
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="truncate text-xs">{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {inSettings ? (
              <DropdownMenuItem asChild>
                <Link to="/">
                  <ArrowLeft />
                  {ct('back')}
                </Link>
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem asChild>
                <Link to="/settings/general">
                  <Settings2 />
                  {st('settings')}
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={async () => {
                await authClient.signOut()
                window.location.href = '/sign-in'
              }}
            >
              <LogOut />
              {t('logOut')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
