import { createFileRoute } from '@tanstack/react-router'
import { ProductionPage } from '#/features/production/pages/production-page'

export const Route = createFileRoute('/_org/production/')({
  beforeLoad: () => ({
    breadcrumb: 'production',
    pageTitle: 'production',
  }),
  component: ProductionRoute,
})

function ProductionRoute() {
  const ctx = Route.useRouteContext() as {
    session: unknown
    org: { id: string }
  }

  return <ProductionPage orgId={ctx.org.id} />
}
