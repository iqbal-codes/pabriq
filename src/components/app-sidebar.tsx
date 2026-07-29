'use client'

import { Link, useLocation } from '@tanstack/react-router'
import {
  ArrowLeft,
  Building2,
  Cpu,
  CreditCard,
  FileText,
  GalleryVerticalEnd,
  KanbanSquare,
  LayoutDashboard,
  MessageSquare,
  Package,
  Settings2,
  ShoppingCart,
  UserRound,
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

type MainNavItem = {
  key: 'dashboard' | 'orders' | 'customers' | 'products' | 'production'
  href: string
  icon: React.ComponentType<{ className?: string }>
}

type SettingsNavItem = {
  key:
    | 'general'
    | 'profile'
    | 'members'
    | 'channels'
    | 'stages'
    | 'shopFloorDevices'
    | 'paymentMethods'
    | 'invoicing'
  href: string
  icon: React.ComponentType<{ className?: string }>
}

const allNavItems: MainNavItem[] = [
  { key: 'dashboard', href: '/', icon: LayoutDashboard },
  { key: 'orders', href: '/orders', icon: ShoppingCart },
  { key: 'customers', href: '/customers', icon: Users },
  { key: 'products', href: '/products', icon: Package },
  { key: 'production', href: '/production', icon: KanbanSquare },
]

const settingsNavItems: SettingsNavItem[] = [
  { key: 'general', href: '/settings/general', icon: Building2 },
  { key: 'profile', href: '/settings/profile', icon: UserRound },
  { key: 'members', href: '/settings/members', icon: Users },
  { key: 'channels', href: '/settings/channels', icon: MessageSquare },
  {
    key: 'stages',
    href: '/settings/production-stages',
    icon: KanbanSquare,
  },
  {
    key: 'shopFloorDevices',
    href: '/settings/shop-floor-devices',
    icon: Cpu,
  },
  {
    key: 'paymentMethods',
    href: '/settings/payment-methods',
    icon: CreditCard,
  },
  { key: 'invoicing', href: '/settings/invoicing', icon: FileText },
]

function getVisibleNavItems(role: Role): MainNavItem[] {
  return allNavItems.filter((item) => {
    if (item.key === 'production') return canViewProduction(role)
    if (['customers', 'products', 'dashboard', 'orders'].includes(item.key)) {
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
  const ct = useTranslations('common')
  const st = useTranslations('settings')
  const pt = useTranslations('production')
  const navItems = getVisibleNavItems(role)
  const { pathname } = useLocation()
  const isSettingsSection = pathname.startsWith('/settings')

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
        <SidebarMenu className="px-2">
          {(isSettingsSection ? settingsNavItems : navItems).map((item) => {
            const isActive = isSettingsSection
              ? pathname === item.href
              : item.href === '/'
                ? pathname === '/'
                : (() => {
                    const itemSegments = item.href.split('/').filter(Boolean)
                    const pathSegments = pathname.split('/').filter(Boolean)
                    return (
                      itemSegments.length === pathSegments.length &&
                      itemSegments.every(
                        (segment, index) => pathSegments[index] === segment,
                      )
                    )
                  })()
            const label = isSettingsSection
              ? item.key === 'stages'
                ? pt('stageManagement')
                : item.key === 'general'
                  ? st('general')
                  : item.key === 'profile'
                    ? st('profile')
                    : item.key === 'members'
                      ? st('members')
                      : item.key === 'channels'
                        ? st('channels')
                        : item.key === 'paymentMethods'
                          ? st('paymentMethods')
                          : st('invoicing')
              : t(item.key as MainNavItem['key'])
            return (
              <SidebarMenuItem key={item.key}>
                <SidebarMenuButton asChild isActive={isActive} tooltip={label}>
                  <Link to={item.href}>
                    <item.icon />
                    <span>{label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <div className="flex items-center justify-end gap-1 border-b border-sidebar-border px-3 py-1 md:hidden">
          <ThemeToggle />
          <LanguageToggle />
        </div>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={isSettingsSection}
              tooltip={isSettingsSection ? ct('back') : t('settings')}
            >
              <Link to={isSettingsSection ? '/' : '/settings/general'}>
                {isSettingsSection ? <ArrowLeft /> : <Settings2 />}
                <span>{isSettingsSection ? ct('back') : t('settings')}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
