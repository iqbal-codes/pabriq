import { createFileRoute } from '@tanstack/react-router'
import { MembersPage } from '#/features/members/pages/members-page'

export const Route = createFileRoute('/_org/settings/members')({
  beforeLoad: ({ context }) => ({
    breadcrumb: 'members',
    pageTitle: 'members',
    orgRole: (context.org as Record<string, unknown>).role as string,
  }),
  component: function MembersRoute() {
    const { orgRole } = Route.useRouteContext()
    return <MembersPage orgRole={orgRole} />
  },
})
