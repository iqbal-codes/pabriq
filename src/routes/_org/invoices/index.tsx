import { createFileRoute } from '@tanstack/react-router'
import { InvoiceListPage } from '#/features/invoices/pages/invoice-list-page'

export const Route = createFileRoute('/_org/invoices/')({
  beforeLoad: () => ({
    breadcrumb: 'invoices',
    pageTitle: 'invoices',
    primaryAction: { label: 'createInvoice', href: '/invoices/new' },
  }),
  component: InvoiceListPage,
})
