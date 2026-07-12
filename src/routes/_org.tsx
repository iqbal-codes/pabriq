import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { ForbiddenPage } from '#/components/app/forbidden-page'
import { GlobalModalContainer } from '#/components/app/global-modal/global-modal-container'
import { LanguageToggle, ThemeToggle } from '#/components/app/header-controls'
import { Breadcrumbs } from '#/components/app/page-shell/breadcrumbs'
import { RoutePendingOverlay } from '#/components/app/route-pending-overlay'
import { AppSidebar } from '#/components/app-sidebar'
import { Separator } from '#/components/ui/separator'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '#/components/ui/sidebar'
import { NotificationBell } from '#/features/notifications/components/notification-bell'
import type { Role } from '#/features/permissions/model'
import { globalOverlaySearchSchema } from '#/hooks/use-global-overlay'
import { resolveOrgContext } from '#/lib/auth-session'

export const Route = createFileRoute('/_org')({
  validateSearch: (search) => globalOverlaySearchSchema.parse(search),
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
  const role: Role = org.role
  const user = {
    name: session.user.name || session.user.email,
    email: session.user.email,
    avatar: session.user.image || '',
  }

  return (
    <SidebarProvider>
      <AppSidebar user={user} org={org} role={role} />
      <SidebarInset className="overflow-hidden!">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
          <div className="flex min-w-0 items-center gap-2">
            <SidebarTrigger />
            <Separator orientation="vertical" className="h-6!" />
            <div className="hidden md:flex items-center gap-2">
              <Breadcrumbs />
            </div>
          </div>
          <div className="ml-auto flex items-center gap-1">
            <NotificationBell />
            <div className="hidden md:flex items-center gap-1">
              <ThemeToggle />
              <LanguageToggle />
            </div>
          </div>
        </header>
        <div className="relative flex-1 min-w-0 overflow-x-auto">
          <Outlet />
          {/* <FloatingAssistant orgId={org.id} userId={session.user.id} /> */}
          <GlobalModalContainer />
          <RoutePendingOverlay />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
