import { createFileRoute, redirect } from '@tanstack/react-router'
import { AcceptInvitationPage } from '#/features/members/pages/accept-invitation-page'
import { getCurrentSession } from '#/lib/auth-session'

export const Route = createFileRoute('/invite/accept')({
  validateSearch: (search: Record<string, string | undefined>) => ({
    id: search.id ?? '',
  }),
  beforeLoad: async ({ search }) => {
    if (!search.id) {
      throw redirect({ to: '/' })
    }
    const session = await getCurrentSession()
    if (!session) {
      throw redirect({
        to: '/sign-in',
        search: { redirect: `/invite/accept?id=${search.id}` },
      })
    }
    return { invitationId: search.id, pageTitle: 'acceptInvitation' as const }
  },
  component: function InviteAcceptRoute() {
    const { invitationId } = Route.useRouteContext()
    return <AcceptInvitationPage invitationId={invitationId} />
  },
})
