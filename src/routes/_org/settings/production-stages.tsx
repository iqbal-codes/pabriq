import { createFileRoute, redirect } from '@tanstack/react-router'
import { canManageStages, type Role } from '#/features/permissions/model'
import { StageManagementPage } from '#/features/production/pages/stage-management-page'

type ProductionStagesSearch = {
  board?: string
}

export const Route = createFileRoute('/_org/settings/production-stages')({
  validateSearch: (
    search: Record<string, unknown>,
  ): ProductionStagesSearch => ({
    board: typeof search.board === 'string' ? search.board : undefined,
  }),
  beforeLoad: ({ context }) => {
    const role = ((context.org as Record<string, unknown>).role ??
      'member') as Role
    if (!canManageStages(role)) {
      throw redirect({ to: '/' })
    }
    return {
      breadcrumb: 'productionStages',
      pageTitle: 'productionStages',
    }
  },
  component: StageManagementPage,
})
