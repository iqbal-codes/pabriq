import { createFileRoute } from '@tanstack/react-router'
import { InvoiceDetailPage } from '#/features/invoices/pages/invoice-detail-page'

export const Route = createFileRoute('/_org/invoices/$id/')({
  beforeLoad: () => ({
    breadcrumb: 'detail',
    parentBreadcrumbs: [{ label: 'invoices', href: '/invoices' }],
    pageTitle: 'viewInvoice',
  }),
  component: InvoiceDetailPage,
})
