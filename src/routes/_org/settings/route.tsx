import { createFileRoute, Outlet } from '@tanstack/react-router'
import { PageContent } from '#/components/app/page-shell/page-content'

export const Route = createFileRoute('/_org/settings')({
  component: SettingsLayout,
})

function SettingsLayout() {
  return (
    <PageContent>
      <Outlet />
    </PageContent>
  )
}
