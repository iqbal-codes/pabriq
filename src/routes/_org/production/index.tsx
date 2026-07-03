import { createFileRoute } from '@tanstack/react-router'
import type { Role } from '#/features/permissions/model'
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
    org: { id: string; role: Role }
  }

  return <ProductionPage orgId={ctx.org.id} role={ctx.org.role} />
}
