import {
  createFileRoute,
  Link,
  Outlet,
  redirect,
  useRouterState,
} from '@tanstack/react-router'
import { useTranslations } from 'use-intl'
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
import { listUserOrgs } from '#/features/auth/org'
import type { Role } from '#/features/permissions/model'
import { getCurrentSession } from '#/lib/auth-session'

export const Route = createFileRoute('/_org')({
  beforeLoad: async ({ location }) => {
    const session = await getCurrentSession()
    if (!session) {
      throw redirect({
        to: '/sign-in',
        search: { redirect: location.href },
      })
    }

    const orgs = await listUserOrgs()
    if (!orgs || orgs.length === 0) {
      throw redirect({ to: '/onboarding' })
    }

    return { session, org: orgs[0] }
  },
  component: OrgLayout,
})

function OrgLayout() {
  const { session, org } = Route.useRouteContext()
  const bt = useTranslations('breadcrumb')
  const role: Role = ((org as Record<string, unknown>).role as Role) ?? 'member'
  const user = {
    name: session.user.name || session.user.email,
    email: session.user.email,
    avatar: session.user.image || '',
  }

  const matches = useRouterState({ select: (s) => s.matches })
  const leafMatch = matches.filter((m) => m.routeId !== '__root__').at(-1)
  const pageTitleKey = (
    leafMatch?.context as unknown as Record<string, unknown>
  )?.pageTitle as
    | 'dashboard'
    | 'detail'
    | 'edit'
    | 'new'
    | 'customers'
    | 'createCustomer'
    | 'editCustomer'
    | 'viewCustomer'
    | 'products'
    | 'newProduct'
    | 'editProduct'
    | 'orders'
    | 'createOrder'
    | 'viewOrder'
    | 'editOrder'
    | 'invoices'
    | 'createInvoice'
    | 'viewInvoice'
    | 'settings'
    | 'general'
    | 'productionStages'
    | 'paymentMethods'
    | 'members'
    | 'profile'
    | undefined
  const primaryAction = (
    leafMatch?.context as unknown as Record<string, unknown>
  )?.primaryAction as
    | {
        label:
          | 'dashboard'
          | 'detail'
          | 'edit'
          | 'new'
          | 'customers'
          | 'createCustomer'
          | 'editCustomer'
          | 'viewCustomer'
          | 'products'
          | 'newProduct'
          | 'editProduct'
          | 'orders'
          | 'createOrder'
          | 'viewOrder'
          | 'editOrder'
          | 'invoices'
          | 'createInvoice'
          | 'viewInvoice'
          | 'settings'
          | 'general'
          | 'productionStages'
          | 'paymentMethods'
          | 'members'
          | 'profile'
        href: string
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
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
