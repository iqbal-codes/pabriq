import { createFileRoute } from '@tanstack/react-router'
import { InvoicingSettingsPage } from '#/features/settings/pages/invoicing-settings-page'

export const Route = createFileRoute('/_org/settings/invoicing')({
  beforeLoad: () => ({ breadcrumb: 'invoicing', pageTitle: 'invoicing' }),
  component: InvoicingSettingsPage,
})
