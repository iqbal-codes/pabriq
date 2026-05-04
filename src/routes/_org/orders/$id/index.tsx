import { createFileRoute } from '@tanstack/react-router'
import { ViewOrderPage } from '#/features/orders/pages/view-order-page'

export const Route = createFileRoute('/_org/orders/$id/')({
  beforeLoad: () => ({
    breadcrumb: 'detail',
    parentBreadcrumbs: [{ label: 'orders', href: '/orders' }],
    pageTitle: 'viewOrder',
  }),
  component: ViewOrderPage,
})
