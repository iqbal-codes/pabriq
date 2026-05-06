'use client'

import { Link } from '@tanstack/react-router'
import {
  FileText,
  GalleryVerticalEnd,
  LayoutDashboard,
  Package,
  Settings2,
  ShoppingCart,
  Users,
  Wrench,
} from 'lucide-react'
import { useTranslations } from 'use-intl'
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

type NavItem = {
  key: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

const allNavItems: NavItem[] = [
  { key: 'dashboard', href: '/', icon: LayoutDashboard },
  { key: 'orders', href: '/orders', icon: ShoppingCart },
  { key: 'customers', href: '/customers', icon: Users },
  { key: 'products', href: '/products', icon: Package },
  { key: 'invoices', href: '/invoices', icon: FileText },
  { key: 'production', href: '/production', icon: Wrench },
  { key: 'settings', href: '/settings/general', icon: Settings2 },
]

function getVisibleNavItems(role: Role): NavItem[] {
  return allNavItems.filter((item) => {
    if (item.key === 'production') return canViewProduction(role)
    if (
      [
        'customers',
        'products',
        'invoices',
        'settings',
        'dashboard',
        'orders',
      ].includes(item.key)
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

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="cursor-default">
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <GalleryVerticalEnd className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{org.name}</span>
                <span className="truncate text-xs">{org.slug}</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.key}>
              <SidebarMenuButton asChild tooltip={t(item.key)}>
                <Link to={item.href}>
                  {item.icon && <item.icon />}
                  <span>{t(item.key)}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
