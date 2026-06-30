import { useTranslations } from 'use-intl'
import { Button } from '#/components/ui/button'
import type { InvoiceRow } from '#/features/invoices/model'
import { OrderInvoicesCard } from '#/features/orders/components/order-invoices-card'

type OrderInvoicesSectionProps = {
  orderInvoices: InvoiceRow[]
  invoicePayments: Record<
    string,
    Array<{ id: string; proofAssetId: string | null }>
  >
  canCreateInvoice: boolean
  onCreateInvoice: () => void
  onMarkInvoicePaid: (invoiceId: string) => void
  isMarkingPaid: boolean
}

export function OrderInvoicesSection({
  orderInvoices,
  invoicePayments,
  canCreateInvoice,
  onCreateInvoice,
  onMarkInvoicePaid,
  isMarkingPaid,
}: OrderInvoicesSectionProps): React.ReactElement {
  const it = useTranslations('invoices')

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-lg font-semibold">{it('title')}</h3>
        {canCreateInvoice && (
          <Button variant="outline" size="sm" onClick={onCreateInvoice}>
            <span className="mr-1">+</span>
            {it('createInvoice')}
          </Button>
        )}
      </div>
      <OrderInvoicesCard
        orderInvoices={orderInvoices}
        invoicePayments={invoicePayments}
        onMarkInvoicePaid={onMarkInvoicePaid}
        isMarkingPaid={isMarkingPaid}
      />
    </div>
  )
}
