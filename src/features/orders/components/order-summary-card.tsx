import { Mail, Phone, User } from 'lucide-react'
import { useTranslations } from 'use-intl'
import { AssetImage } from '#/components/app/asset-image'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { currencyFormatter } from './view-order-utils'

export function OrderSummaryCard({
  customerName,
  customerPhone,
  customerEmail,
  customerPhotoAssetId,
  orderNotes,
  orderTotal,
}: {
  customerName: string | null
  customerPhone: string | null
  customerEmail: string | null
  customerPhotoAssetId: string | null
  orderNotes: string | null
  orderTotal: number
}) {
  const t = useTranslations('orders')

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('summary')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          {customerPhotoAssetId ? (
            <AssetImage
              assetId={customerPhotoAssetId}
              assetKind="image"
              className="size-10 rounded-full object-cover"
            />
          ) : (
            <div className="flex size-10 items-center justify-center rounded-full bg-muted">
              <User className="size-5 text-muted-foreground" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="font-medium">{customerName ?? t('guestCustomer')}</p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {customerPhone && (
                <span className="flex items-center gap-1">
                  <Phone className="size-3" />
                  {customerPhone}
                </span>
              )}
              {customerEmail && (
                <span className="flex items-center gap-1">
                  <Mail className="size-3" />
                  {customerEmail}
                </span>
              )}
            </div>
          </div>
        </div>
        {orderNotes && (
          <div>
            <p className="text-sm text-muted-foreground">{t('notes')}</p>
            <p className="whitespace-pre-wrap">{orderNotes}</p>
          </div>
        )}
        <div>
          <p className="text-sm text-muted-foreground">{t('total')}</p>
          <p className="text-lg font-semibold">
            {currencyFormatter.format(orderTotal)}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
