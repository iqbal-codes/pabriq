import { createFileRoute } from '@tanstack/react-router'
import { StageManagementPage } from '#/features/production/pages/stage-management-page'

export const Route = createFileRoute('/_org/settings/production-stages')({
  beforeLoad: () => ({
    breadcrumb: 'productionStages',
    pageTitle: 'productionStages',
  }),
  component: StageManagementPage,
})
