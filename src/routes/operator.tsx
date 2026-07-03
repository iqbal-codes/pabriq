import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { ForbiddenPage } from '#/components/app/forbidden-page'
import { OperatorEmptyOrg } from '#/components/app/operator-empty-org'
import { OperatorHeader } from '#/components/app/operator-header'
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
      role: string
    }
  | {
      access: 'allowed'
      session: {
        user: { name: string | null; email: string; image: string | null }
      }
      org: { name: string; slug: string; logo?: string | null }
      role: string
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
      return { access: 'no-org' as const, session: result.session }
    }

    if (result.role === 'member') {
      return {
        access: 'allowed' as const,
        session: result.session,
        org: result.org,
        role: result.role,
      }
    }

    return {
      access: 'forbidden' as const,
      session: result.session,
      org: result.org,
      role: result.role,
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
      <>
        <OperatorHeader org={null} user={user} />
        <OperatorEmptyOrg />
      </>
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
    <>
      <OperatorHeader org={ctx.org} user={user} />
      <Outlet />
    </>
  )
}
