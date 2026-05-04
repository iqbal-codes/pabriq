import { createFileRoute } from '@tanstack/react-router'
import { EditProductPage } from '#/features/products/pages/edit-product-page'

export const Route = createFileRoute('/_org/products/$id/edit')({
  beforeLoad: () => ({
    breadcrumb: 'edit',
    parentBreadcrumbs: [{ label: 'products', href: '/products' }],
    pageTitle: 'editProduct',
  }),
  component: EditProductPage,
})
