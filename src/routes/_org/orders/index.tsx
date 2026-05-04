import { createFileRoute } from '@tanstack/react-router'
import { OrdersListPage } from '#/features/orders/pages/orders-list-page'

export const Route = createFileRoute('/_org/orders/')({
  validateSearch: () => ({}),
  beforeLoad: () => ({
    breadcrumb: 'orders',
    pageTitle: 'orders',
    primaryAction: { label: 'createOrder', href: '/orders/new' },
  }),
  component: OrdersListPage,
})
