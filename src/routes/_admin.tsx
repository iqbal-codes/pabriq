import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { LanguageToggle, ThemeToggle } from '#/components/app/header-controls'
import { AppSidebar } from '#/components/app-sidebar'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '#/components/ui/sidebar'
import { getCurrentSession } from '#/lib/auth-session'

export const Route = createFileRoute('/_admin')({
  beforeLoad: async ({
    location,
  }: {
    location: { href: string }
    // biome-ignore lint/suspicious/noExplicitAny: TanStack Router type inference limitation
  }): Promise<any> => {
    const { isPlatformAdmin } = await import('#/features/permissions/model')
    const session = await getCurrentSession()

    if (!session) {
      throw redirect({
        to: '/sign-in',
        search: { redirect: location.href },
      })
    }

    const isAdmin = await isPlatformAdmin(session.user.id)

    if (!isAdmin) {
      throw redirect({ to: '/' })
    }

    return {
      session: {
        user: {
          id: session.user.id,
          name: session.user.name,
          email: session.user.email,
          image: null,
        },
      },
    }
  },
  component: AdminLayout,
})

function AdminLayout() {
  const ctx = Route.useRouteContext() as unknown as {
    session: {
      user: {
        id: string
        name: string | null
        email: string
        image: string | null
      }
    }
  }

  const user = {
    id: ctx.session.user.id,
    name: ctx.session.user.name ?? ctx.session.user.email,
    email: ctx.session.user.email,
    avatar: ctx.session.user.image ?? '',
  }

  return (
    <SidebarProvider>
      <AppSidebar sidebarMode="admin" user={user} />
      <SidebarInset>
        <header className="flex h-14 items-center gap-4 border-b px-4">
          <SidebarTrigger />
          <div className="flex-1" />
          <LanguageToggle />
          <ThemeToggle />
        </header>
        <div className="flex-1 overflow-auto">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
