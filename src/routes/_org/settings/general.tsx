import { createFileRoute } from '@tanstack/react-router'
import { GeneralSettingsPage } from '#/features/settings/pages/general-settings-page'

export const Route = createFileRoute('/_org/settings/general')({
  beforeLoad: () => ({
    breadcrumb: 'settings',
    pageTitle: 'settings',
  }),
  component: GeneralSettingsPage,
})
