import { AvatarPhoto } from '#/components/app/avatar-photo'
import type { GetInvoiceResult } from '#/features/invoices/model'

type InvoiceCustomerCardProps = {
  customer: GetInvoiceResult['customer']
  fallbackName: string
}

export function InvoiceCustomerCard({
  customer,
  fallbackName,
}: InvoiceCustomerCardProps) {
  const name = customer?.name ?? fallbackName

  return (
    <div className="flex items-center gap-4 rounded-xl border bg-card p-6">
      <AvatarPhoto
        assetId={customer?.photoAssetId ?? null}
        name={name}
        className="size-14"
      />
      <div>
        <p className="font-semibold">{name}</p>
        {customer?.phone && (
          <p className="text-sm text-muted-foreground">+62{customer.phone}</p>
        )}
      </div>
    </div>
  )
}
