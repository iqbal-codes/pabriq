import { createFileRoute, redirect } from '@tanstack/react-router'
import ChannelsSettingsPage from '#/features/channels/components/channels-settings-page'
import { canManageSettings, type Role } from '#/features/permissions/model'

export const Route = createFileRoute('/_org/settings/channels')({
  beforeLoad: ({ context }) => {
    const role = ((context.org as Record<string, unknown> | undefined)?.role ??
      'member') as Role
    if (!canManageSettings(role)) {
      throw redirect({ to: '/' })
    }
    return {
      breadcrumb: 'channels',
      pageTitle: 'channels',
    }
  },
  component: ChannelsSettingsPage,
})
