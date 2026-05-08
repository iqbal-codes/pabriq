import { createFileRoute } from '@tanstack/react-router'
import { CreateInvoicePage } from '#/features/invoices/pages/create-invoice-page'

export const Route = createFileRoute('/_org/invoices/new')({
  beforeLoad: () => ({
    breadcrumb: 'new',
    parentBreadcrumbs: [{ label: 'invoices', href: '/invoices' }],
    pageTitle: 'createInvoice',
  }),
  component: CreateInvoicePage,
})
