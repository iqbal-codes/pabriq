import { createFileRoute, useParams } from '@tanstack/react-router'
import { PortalPage } from '#/features/portal/pages/portal-page'

export const Route = createFileRoute('/portal/$token')({
  beforeLoad: () => ({ pageTitle: 'completeOrderData' as const }),
  component: PortalRoute,
})

function PortalRoute() {
  const { token } = useParams({ from: Route.id })

  return <PortalPage token={token} />
}
