import { Banknote, CheckCircle2, Clock, Upload, XCircle } from 'lucide-react'
import { useTranslations } from 'use-intl'

type PaymentEvent = {
  id: string
  type: 'created' | 'payment_submitted' | 'payment_confirmed' | 'paid' | 'void'
  createdAt: string
  description: string
  proofAssetId?: string
}

function formatDateTime(dateStr: string): { date: string; time: string } {
  const d = new Date(dateStr)
  return {
    date: d.toLocaleDateString('id-ID'),
    time: d.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    }),
  }
}

function getEventIcon(
  type: 'created' | 'payment_submitted' | 'payment_confirmed' | 'paid' | 'void',
) {
  switch (type) {
    case 'created':
      return (
        <Clock className="size-3.5 text-muted-foreground shrink-0 mt-0.5" />
      )
    case 'payment_submitted':
      return <Upload className="size-3.5 text-brand-accent shrink-0 mt-0.5" />
    case 'payment_confirmed':
    case 'paid':
      return <CheckCircle2 className="size-3.5 text-success shrink-0 mt-0.5" />
    case 'void':
      return <XCircle className="size-3.5 text-destructive shrink-0 mt-0.5" />
    default:
      return (
        <Banknote className="size-3.5 text-muted-foreground shrink-0 mt-0.5" />
      )
  }
}

export function InvoiceStatusTimeline({
  invoiceCreatedAt,
  payments,
  invoiceStatus,
}: {
  invoiceCreatedAt: string
  payments: Array<{
    id: string
    amount: number
    status: string
    method: string | null
    proofAssetId: string | null
    receivedAt: string | Date | null
    createdAt: string | Date
    updatedAt: string | Date | null
  }>
  invoiceStatus: string
}) {
  const t = useTranslations('invoices')
  const events: PaymentEvent[] = []

  // Invoice created event
  events.push({
    id: 'created',
    type: 'created',
    createdAt: new Date(invoiceCreatedAt).toISOString(),
    description: t('invoiceCreated'),
  })

  // Process payments to create events
  payments.forEach((pm) => {
    const receivedAt = pm.receivedAt
      ? new Date(pm.receivedAt).toISOString()
      : new Date(pm.createdAt).toISOString()

    // Payment proof submitted
    if (pm.proofAssetId && pm.status !== 'rejected') {
      events.push({
        id: `proof-${pm.id}`,
        type: 'payment_submitted',
        createdAt: receivedAt,
        description: t('paymentProofUploaded'),
        proofAssetId: pm.proofAssetId,
      })
    }

    // Payment confirmed
    if (pm.status === 'confirmed') {
      const updatedAt = pm.updatedAt
        ? new Date(pm.updatedAt).toISOString()
        : receivedAt
      events.push({
        id: `confirmed-${pm.id}`,
        type: 'payment_confirmed',
        createdAt: updatedAt,
        description: `${t('invoicePaid')} — Rp ${pm.amount.toLocaleString('id-ID')}`,
      })
    }
  })

  // Invoice paid event (if fully paid)
  if (invoiceStatus === 'paid') {
    const confirmedPayment = payments.find((p) => p.status === 'confirmed')
    events.push({
      id: 'paid',
      type: 'paid',
      createdAt: confirmedPayment?.updatedAt
        ? new Date(confirmedPayment.updatedAt).toISOString()
        : new Date().toISOString(),
      description: t('invoicePaid'),
    })
  }

  // Invoice void event
  if (invoiceStatus === 'void') {
    events.push({
      id: 'void',
      type: 'void',
      createdAt: new Date().toISOString(),
      description: t('invoiceVoided'),
    })
  }

  // Sort by date
  events.sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  )

  // Only show timeline if there are events beyond creation
  if (events.length <= 1 && invoiceStatus === 'unpaid') {
    return null
  }

  return (
    <div className="rounded-xl border bg-card p-6">
      <p className="font-semibold text-muted-foreground mb-4">
        {t('paymentHistory')}
      </p>
      <div className="space-y-3">
        {events.map((event, i) => {
          const { date, time } = formatDateTime(event.createdAt)

          return (
            <div key={event.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="size-6 flex items-start justify-center shrink-0 mt-0.5">
                  {getEventIcon(event.type)}
                </div>
                {i < events.length - 1 && (
                  <div className="w-px flex-1 bg-border" />
                )}
              </div>
              <div className="pb-3 min-w-0 flex-1">
                <p className="text-[13px] text-muted-foreground">
                  {date} {time}
                </p>
                <p className="text-sm font-medium">{event.description}</p>
                {event.proofAssetId && (
                  <a
                    href={`/api/assets/${event.proofAssetId}/download`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 block text-[13px] font-medium text-brand-accent hover:underline"
                  >
                    {t('viewPaymentProof')}
                  </a>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
