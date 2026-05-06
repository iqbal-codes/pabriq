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
        : 'general'

  return (
    <PageContent>
      <Tabs value={activeTab} className="w-full">
        <TabsList>
          <TabsTrigger value="general" asChild>
            <Link to="/settings/general">{t('general')}</Link>
          </TabsTrigger>
          <TabsTrigger value="members" asChild>
            <Link to="/settings/members">{st('members')}</Link>
          </TabsTrigger>
          <TabsTrigger value="profile" asChild>
            <Link to="/settings/profile">{st('profile')}</Link>
          </TabsTrigger>
          <TabsTrigger value="stages" asChild>
            <Link to="/settings/production-stages">
              {pt('stageManagement')}
            </Link>
          </TabsTrigger>
        </TabsList>
      </Tabs>
      <div className="mt-6">
        <Outlet />
      </div>
    </PageContent>
  )
}
