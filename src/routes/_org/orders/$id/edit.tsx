import { createFileRoute } from '@tanstack/react-router'
import { EditOrderPage } from '#/features/orders/pages/edit-order-page'

export const Route = createFileRoute('/_org/orders/$id/edit')({
  beforeLoad: () => ({
    breadcrumb: 'editOrder',
    parentBreadcrumbs: [{ label: 'orders', href: '/orders' }],
    pageTitle: 'editOrder',
  }),
  component: EditOrderPage,
})
