import { createFileRoute, redirect } from '@tanstack/react-router'
import { canManageProducts, type Role } from '#/features/permissions/model'
import { ProductTemplatesPage } from '#/features/product-templates/pages/product-templates-page'
import { globalOverlaySearchSchema } from '#/hooks/use-global-overlay'

export const Route = createFileRoute('/_org/settings/product-templates')({
  validateSearch: (search) => globalOverlaySearchSchema.parse(search),
  beforeLoad: ({ context }) => {
    const role = ((context.org as Record<string, unknown>).role ??
      'member') as Role
    if (!canManageProducts(role)) {
      throw redirect({ to: '/' })
    }
    return {
      breadcrumb: 'productTemplates',
      pageTitle: 'productTemplates',
    }
  },
  component: ProductTemplatesPage,
})
