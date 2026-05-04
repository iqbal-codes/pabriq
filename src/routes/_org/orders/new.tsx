import { createFileRoute } from '@tanstack/react-router'
import { CreateOrderPage } from '#/features/orders/pages/create-order-page'

export const Route = createFileRoute('/_org/orders/new')({
  beforeLoad: () => ({
    breadcrumb: 'createOrder',
    pageTitle: 'createOrder',
    parentBreadcrumbs: [{ label: 'orders', href: '/orders' }],
  }),
  component: CreateOrderPage,
})
