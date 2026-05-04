import { createFileRoute } from '@tanstack/react-router'
import { ViewProductPage } from '#/features/products/pages/view-product-page'

export const Route = createFileRoute('/_org/products/$id/')({
  beforeLoad: () => ({
    breadcrumb: 'detail',
    parentBreadcrumbs: [{ label: 'products', href: '/products' }],
    pageTitle: 'viewProduct',
  }),
  component: ViewProductPage,
})
