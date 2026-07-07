import { createFileRoute } from '@tanstack/react-router'
import { ProductsListPage } from '#/features/products/pages/products-list-page'

export const Route = createFileRoute('/_org/products/new')({
  beforeLoad: () => ({
    breadcrumb: 'new',
    parentBreadcrumbs: [{ label: 'products', href: '/products' }],
    pageTitle: 'createProduct',
  }),
  component: () => <ProductsListPage sheet={{ type: 'create' }} />,
})
