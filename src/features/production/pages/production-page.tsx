import type { ReactElement } from 'react'
import { ThreeColumnPage } from '#/features/production/pages/three-column-page'

export function ProductionPage({ orgId }: { orgId: string }): ReactElement {
  return <ThreeColumnPage orgId={orgId} />
}
