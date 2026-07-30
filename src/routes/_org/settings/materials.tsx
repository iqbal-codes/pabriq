import { createFileRoute, redirect } from '@tanstack/react-router'
import { MaterialsPage } from '#/features/materials/pages/materials-page'
import { canManageStages, type Role } from '#/features/permissions/model'

export const Route = createFileRoute('/_org/settings/materials')({
  beforeLoad: ({ context }) => {
    const role = ((context.org as Record<string, unknown>).role ??
      'member') as Role
    if (!canManageStages(role)) {
      throw redirect({ to: '/' })
    }
    return {
      breadcrumb: 'materials',
      pageTitle: 'materials',
    }
  },
  component: MaterialsPage,
})
