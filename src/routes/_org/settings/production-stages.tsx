import { createFileRoute, redirect } from '@tanstack/react-router'
import { canManageStages, type Role } from '#/features/permissions/model'
import { StageManagementPage } from '#/features/production/pages/stage-management-page'

export const Route = createFileRoute('/_org/settings/production-stages')({
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
