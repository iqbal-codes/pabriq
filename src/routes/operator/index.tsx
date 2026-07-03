import { createFileRoute } from '@tanstack/react-router'
import type { Role } from '#/features/permissions/model'
import { ProductionPage } from '#/features/production/pages/production-page'

export const Route = createFileRoute('/operator/')({
  component: OperatorIndex,
})

function OperatorIndex() {
  const ctx = Route.useRouteContext() as {
    access: string
    org: { id: string }
    role: Role
  }

  return <ProductionPage orgId={ctx.org.id} role={ctx.role} />
}
