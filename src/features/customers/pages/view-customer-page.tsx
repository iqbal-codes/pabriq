import { useTranslations } from 'use-intl'
import { AssetImage } from '#/components/app/asset-image'
import { PageContent } from '#/components/app/page-shell/page-content'
import { PageHeader } from '#/components/app/page-shell/page-header'
import { Badge } from '#/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { useCustomer } from '#/features/customers/hooks'
import { Route } from '#/routes/_org/customers/$id'

export function ViewCustomerPage() {
  const { id } = Route.useParams()
  const customer = useCustomer(id).data
  const t = useTranslations('customers')
  const ct = useTranslations('common')
  const st = useTranslations('status')

  if (!customer) {
    return (
      <PageContent>
        <p>{t('noCustomers')}</p>
      </PageContent>
    )
  }

  return (
    <PageContent>
      <PageHeader
        title={t('viewCustomer')}
        backAction={{ label: ct('back'), href: '/customers' }}
        primaryAction={{
          label: t('editCustomer'),
          href: `/customers/${customer.id}/edit`,
        }}
      />
      <div className="flex items-center gap-4 mb-6">
        <AssetImage assetId={customer.photoAssetId} className="rounded-full" />
        <div>
          <h1 className="text-2xl font-semibold">{customer.name}</h1>
          <Badge
            variant={customer.active ? 'default' : 'secondary'}
            className="mt-1"
          >
            {customer.active ? st('active') : st('inactive')}
          </Badge>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{t('customerInfo')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">{t('email')}</p>
            <p>{customer.email ?? '—'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{t('phone')}</p>
            <p>{customer.phone ?? '—'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{t('notes')}</p>
            <p className="whitespace-pre-wrap">{customer.notes ?? '—'}</p>
          </div>
        </CardContent>
      </Card>
    </PageContent>
  )
}
