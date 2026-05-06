import { createFileRoute } from '@tanstack/react-router'
import { ProfilePage } from '#/features/settings/pages/profile-page'

export const Route = createFileRoute('/_org/settings/profile')({
  beforeLoad: ({ context }) => ({
    breadcrumb: 'profile',
    pageTitle: 'profile',
    user: (
      context.session as {
        user: { id: string; name: string; email: string; image: string | null }
      }
    ).user,
  }),
  component: function ProfileRoute() {
    const { user } = Route.useRouteContext()
    return <ProfilePage user={user} />
  },
})
