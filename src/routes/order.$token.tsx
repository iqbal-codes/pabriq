import { createFileRoute, useParams } from '@tanstack/react-router'
import { PortalPage } from '#/features/portal/pages/portal-page'

export const Route = createFileRoute('/order/$token')({
  component: PortalRoute,
})

function PortalRoute() {
  const { token } = useParams({ from: Route.id })
  return <PortalPage token={token} />
}
