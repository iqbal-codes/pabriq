import {
  createFileRoute,
  Link,
  Outlet,
  redirect,
  useRouterState,
} from '@tanstack/react-router'
import { useTranslations } from 'use-intl'
import { ForbiddenPage } from '#/components/app/forbidden-page'
import { LanguageToggle, ThemeToggle } from '#/components/app/header-controls'
import { Breadcrumbs } from '#/components/app/page-shell/breadcrumbs'
import { AppSidebar } from '#/components/app-sidebar'
import { Button } from '#/components/ui/button'
import { Separator } from '#/components/ui/separator'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '#/components/ui/sidebar'
import { FloatingAssistant } from '#/features/assistant/components/floating-assistant'
import { NotificationBell } from '#/features/notifications/components/notification-bell'
import type { Role } from '#/features/permissions/model'
import { resolveOrgContext } from '#/lib/auth-session'
import type { Messages } from '#/messages'

type BreadcrumbKey = keyof Messages['breadcrumb']

export const Route = createFileRoute('/_org')({
  beforeLoad: async ({
    location,
  }: {
    location: { pathname: string; href: string }
    // biome-ignore lint/suspicious/noExplicitAny: TanStack Router type inference limitation
  }): Promise<any> => {
    const result = await resolveOrgContext()

    if (!result.ok) {
      if (result.reason === 'unauthenticated') {
        throw redirect({
          to: '/sign-in',
          search: { redirect: location.href },
        })
      }
      throw redirect({ to: '/onboarding' })
    }

    if (result.role === 'member' && location.pathname === '/') {
      throw redirect({ to: '/operator' })
    }

    return {
      session: result.session,
      org: result.org,
      role: result.role,
    }
  },
  component: OrgLayout,
})

function OrgLayout() {
  const ctx = Route.useRouteContext() as unknown as {
    session: {
      user: {
        id: string
        name: string | null
        email: string
        image: string | null
      }
    }
    org: {
      id: string
      name: string
      slug: string
      logo?: string | null
      role: Role
    }
    role: Role
  }

  if (ctx.role === 'member') {
    return <ForbiddenPage actionHref="/operator" actionKey="backToProduction" />
  }

  return <AdminLayout ctx={ctx} />
}

function AdminLayout({
  ctx,
}: {
  ctx: {
    session: {
      user: {
        id: string
        name: string | null
        email: string
        image: string | null
      }
    }
    org: {
      id: string
      name: string
      slug: string
      logo?: string | null
      role: Role
    }
    role: Role
  }
}) {
  const { session, org } = ctx
  const bt = useTranslations('breadcrumb')
  const role: Role = org.role
  const user = {
    name: session.user.name || session.user.email,
    email: session.user.email,
    avatar: session.user.image || '',
  }

  const matches = useRouterState({ select: (s) => s.matches })
  const leafMatch = matches.filter((m) => m.routeId !== '__root__').at(-1)
  const pageTitleKey = (
    leafMatch?.context as unknown as Record<string, unknown>
  )?.pageTitle as BreadcrumbKey | undefined
  const primaryAction = (
    leafMatch?.context as unknown as Record<string, unknown>
  )?.primaryAction as
    | {
        href: string
        label: BreadcrumbKey
      }
    | undefined

  return (
    <SidebarProvider>
      <AppSidebar user={user} org={org} role={role} />
      <SidebarInset className="overflow-hidden!">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
          <div className="flex items-center gap-2 min-w-0">
            <SidebarTrigger />
            <Separator orientation="vertical" className="h-6!" />
            <span className="md:hidden text-base font-medium truncate">
              {pageTitleKey ? bt(pageTitleKey) : null}
            </span>
            <div className="hidden md:flex items-center gap-2">
              <Breadcrumbs />
            </div>
          </div>
          <div className="flex items-center gap-1 ml-auto">
            <NotificationBell />
            <ThemeToggle />
            <LanguageToggle />
          </div>
          <div className="md:hidden flex items-center gap-2">
            {primaryAction && (
              <Button size="sm" asChild>
                <Link to={primaryAction.href}>{bt(primaryAction.label)}</Link>
              </Button>
            )}
          </div>
        </header>
        <div className="overflow-x-auto flex-1 min-w-0">
          <Outlet />
          <FloatingAssistant orgId={org.id} userId={session.user.id} />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
