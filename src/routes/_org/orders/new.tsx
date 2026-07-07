import { createFileRoute } from '@tanstack/react-router'
import { OrdersListPage } from '#/features/orders/pages/orders-list-page'

export const Route = createFileRoute('/_org/orders/new')({
  beforeLoad: () => ({
    breadcrumb: 'createOrder',
    pageTitle: 'createOrder',
    parentBreadcrumbs: [{ label: 'orders', href: '/orders' }],
  }),
  component: () => <OrdersListPage sheet={{ type: 'create' }} />,
})
