import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { ForbiddenPage } from '#/components/app/forbidden-page'
import { OperatorEmptyOrg } from '#/components/app/operator-empty-org'
import { OperatorHeader } from '#/components/app/operator-header'
import type { Role } from '#/features/permissions/model'
import { resolveOrgContext } from '#/lib/auth-session'

type OperatorCtx =
  | {
      access: 'no-org'
      session: {
        user: { name: string | null; email: string; image: string | null }
      }
    }
  | {
      access: 'forbidden'
      session: {
        user: { name: string | null; email: string; image: string | null }
      }
      org: { name: string; slug: string; logo?: string | null }
      role: Role
    }
  | {
      access: 'allowed'
      session: {
        user: { name: string | null; email: string; image: string | null }
      }
      org: { name: string; slug: string; logo?: string | null }
      role: Role
    }

export const Route = createFileRoute('/operator')({
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
      return {
        access: 'no-org' as const,
        session: result.session,
        pageTitle: 'noOrganization' as const,
      }
    }

    if (result.role === 'member' || result.role === 'operator') {
      return {
        access: 'allowed' as const,
        session: result.session,
        org: result.org,
        role: result.role,
        pageTitle: 'production' as const,
      }
    }

    return {
      access: 'forbidden' as const,
      session: result.session,
      org: result.org,
      role: result.role,
      pageTitle: 'accessDenied' as const,
    }
  },
  component: OperatorLayout,
})

function OperatorLayout() {
  const ctx = Route.useRouteContext() as unknown as OperatorCtx

  if (ctx.access === 'no-org') {
    const user = {
      name: ctx.session.user.name || ctx.session.user.email,
      email: ctx.session.user.email,
      avatar: ctx.session.user.image || '',
    }
    return (
      <div className="flex flex-col h-dvh">
        <OperatorHeader org={null} user={user} />
        <OperatorEmptyOrg />
      </div>
    )
  }

  if (ctx.access === 'forbidden') {
    return <ForbiddenPage actionHref="/" actionKey="backToDashboard" />
  }

  const user = {
    name: ctx.session.user.name || ctx.session.user.email,
    email: ctx.session.user.email,
    avatar: ctx.session.user.image || '',
  }

  return (
    <div className="flex flex-col h-dvh">
      <OperatorHeader org={ctx.org} user={user} />
      <div className="flex-1 overflow-auto min-w-0">
        <Outlet />
      </div>
    </div>
  )
}
