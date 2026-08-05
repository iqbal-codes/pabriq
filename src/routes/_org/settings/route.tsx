import {
  createFileRoute,
  Link,
  Outlet,
  useLocation,
} from '@tanstack/react-router'
import { useTranslations } from 'use-intl'
import { PageContent } from '#/components/app/page-shell/page-content'
import { Tabs, TabsList, TabsTrigger } from '#/components/ui/tabs'

export const Route = createFileRoute('/_org/settings')({
  component: SettingsLayout,
})

function SettingsLayout() {
  const t = useTranslations('breadcrumb')
  const pt = useTranslations('production')
  const st = useTranslations('settings')
  const { pathname } = useLocation()

  const activeTab = pathname.includes('/settings/members')
    ? 'members'
    : pathname.includes('/settings/profile')
      ? 'profile'
      : pathname.includes('/settings/production-stages')
        ? 'stages'
        : pathname.includes('/settings/product-templates')
          ? 'productTemplates'
          : pathname.includes('/settings/payment-methods')
            ? 'paymentMethods'
            : pathname.includes('/settings/invoicing')
              ? 'invoicing'
              : 'general'

  return (
    <PageContent>
      <Tabs value={activeTab} className="w-full">
        <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
          <TabsList variant="line">
            <TabsTrigger value="general" asChild>
              <Link to="/settings/general">{t('general')}</Link>
            </TabsTrigger>
            <TabsTrigger value="profile" asChild>
              <Link to="/settings/profile">{st('profile')}</Link>
            </TabsTrigger>
            <TabsTrigger value="members" asChild>
              <Link to="/settings/members">{st('members')}</Link>
            </TabsTrigger>
            <TabsTrigger value="stages" asChild>
              <Link to="/settings/production-stages">
                {pt('stageManagement')}
              </Link>
            </TabsTrigger>
            <TabsTrigger value="productTemplates" asChild>
              <Link to="/settings/product-templates">
                {st('productTemplates')}
              </Link>
            </TabsTrigger>
            <TabsTrigger value="paymentMethods" asChild>
              <Link to="/settings/payment-methods">{st('paymentMethods')}</Link>
            </TabsTrigger>
            <TabsTrigger value="invoicing" asChild>
              <Link to="/settings/invoicing">{st('invoicing')}</Link>
            </TabsTrigger>
          </TabsList>
        </div>
      </Tabs>
      <div className="mt-6">
        <Outlet />
      </div>
    </PageContent>
  )
}
