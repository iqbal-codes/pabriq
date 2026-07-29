import { createFileRoute, redirect } from '@tanstack/react-router'
import { canManageDevices, type Role } from '#/features/permissions/model'
import { ShopFloorDevicesPage } from '#/features/production/pages/shop-floor-devices-page'

export const Route = createFileRoute('/_org/settings/shop-floor-devices')({
  beforeLoad: ({ context }) => {
    const role = ((context.org as Record<string, unknown>).role ??
      'member') as Role
    if (!canManageDevices(role)) {
      throw redirect({ to: '/' })
    }
    return {
      breadcrumb: 'shopFloorDevices',
      pageTitle: 'shopFloorDevices',
    }
  },
  component: ShopFloorDevicesPage,
})
