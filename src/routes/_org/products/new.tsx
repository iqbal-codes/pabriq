import { createFileRoute } from '@tanstack/react-router'
import { CreateProductPage } from '#/features/products/pages/create-product-page'

export const Route = createFileRoute('/_org/products/new')({
  beforeLoad: () => ({
    breadcrumb: 'new',
    parentBreadcrumbs: [{ label: 'products', href: '/products' }],
    pageTitle: 'createProduct',
  }),
  component: CreateProductPage,
})
