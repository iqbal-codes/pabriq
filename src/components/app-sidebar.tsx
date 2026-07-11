'use client'

import { Link, useLocation } from '@tanstack/react-router'
import {
  GalleryVerticalEnd,
  KanbanSquare,
  LayoutDashboard,
  Package,
  Settings2,
  ShoppingCart,
  Users,
} from 'lucide-react'
import { useTranslations } from 'use-intl'
import { AssetImage } from '#/components/app/asset-image'
import { LanguageToggle, ThemeToggle } from '#/components/app/header-controls'
import { NavUser } from '#/components/nav-user'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '#/components/ui/sidebar'
import type { Role } from '#/features/permissions/model'
import { canViewProduction } from '#/features/permissions/model'
import { cn } from '#/lib/utils'

type NavItem = {
  key:
    | 'dashboard'
    | 'orders'
    | 'customers'
    | 'products'
    | 'production'
    | 'settings'
  href: string
  icon: React.ComponentType<{ className?: string }>
}

const allNavItems: NavItem[] = [
  { key: 'dashboard', href: '/', icon: LayoutDashboard },
  { key: 'orders', href: '/orders', icon: ShoppingCart },
  { key: 'customers', href: '/customers', icon: Users },
  { key: 'products', href: '/products', icon: Package },
  { key: 'production', href: '/production', icon: KanbanSquare },
  { key: 'settings', href: '/settings/general', icon: Settings2 },
]

function getVisibleNavItems(role: Role): NavItem[] {
  return allNavItems.filter((item) => {
    if (item.key === 'production') return canViewProduction(role)
    if (
      ['customers', 'products', 'settings', 'dashboard', 'orders'].includes(
        item.key,
      )
    ) {
      return role === 'owner' || role === 'admin'
    }
    return true
  })
}

export function AppSidebar({
  user,
  org,
  role = 'member',
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  user: {
    name: string
    email: string
    avatar: string
  }
  org: {
    name: string
    slug: string
    logo?: string | null
  }
  role?: Role
}) {
  const t = useTranslations('sidebar')
  const navItems = getVisibleNavItems(role)
  const { pathname } = useLocation()

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <Link to={'/'}>
              <SidebarMenuButton size="lg" className="hover:bg-transparent!">
                {org.logo ? (
                  <AssetImage
                    assetId={org.logo}
                    assetKind="image"
                    interactive={false}
                    className="w-8 h-auto rounded-lg object-contain"
                  />
                ) : (
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                    <GalleryVerticalEnd className="size-4" />
                  </div>
                )}
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{org.name}</span>
                </div>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {navItems.map((item) => {
            const isActive =
              item.href === '/'
                ? pathname === '/'
                : item.key === 'settings'
                  ? pathname === '/settings' ||
                    pathname.startsWith('/settings/')
                  : (() => {
                      const itemSegments = item.href.split('/').filter(Boolean)
                      const pathSegments = pathname.split('/').filter(Boolean)
                      return itemSegments.every(
                        (segment, index) => pathSegments[index] === segment,
                      )
                    })()
            return (
              <SidebarMenuItem key={item.key}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive}
                  tooltip={t(item.key)}
                  className={cn(
                    'px-4 border-l-2',
                    isActive && 'border-primary',
                  )}
                >
                  <Link to={item.href}>
                    {item.icon && <item.icon />}
                    <span>{t(item.key)}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <div className="flex items-center justify-between px-3 py-1 md:hidden border-b border-sidebar-border mb-1">
          <span className="text-xs text-sidebar-foreground/75 font-medium">
            {t('settings')}
          </span>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <LanguageToggle />
          </div>
        </div>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
