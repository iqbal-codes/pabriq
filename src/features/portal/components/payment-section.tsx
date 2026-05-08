import { CheckCircle2, Clock, FileText, Upload } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { useTranslations } from 'use-intl'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import type { PortalInvoice } from '../model'

type Props = {
  invoices: PortalInvoice[]
  onUpload: (invoiceId: string, file: File) => Promise<void>
}

export function PaymentSection({ invoices, onUpload }: Props) {
  const t = useTranslations('invoices')
  const st = useTranslations('status')
  const [uploadingId, setUploadingId] = useState<string | null>(null)

  if (invoices.length === 0) return null

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          {t('title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {invoices.map((inv) => {
          const isUnpaid = inv.status === 'unpaid'
          const isOverdue = isUnpaid && new Date(inv.dueDate) < new Date()
          const isPending = isUnpaid && inv.hasPaymentProof

          return (
            <div key={inv.id} className="rounded-lg border p-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="font-medium">{inv.invoiceNumber}</p>
                  {inv.percentage && (
                    <p className="text-sm text-muted-foreground">
                      {t('percentage')}: {inv.percentage}%
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {isOverdue && (
                    <Badge variant="destructive">{t('overdue')}</Badge>
                  )}
                  {isPending ? (
                    <Badge variant="secondary">
                      <Clock className="mr-1 h-3 w-3" />
                      {t('pendingConfirmation')}
                    </Badge>
                  ) : (
                    <Badge variant={isUnpaid ? 'default' : 'secondary'}>
                      {st(inv.status as keyof typeof st)}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="mb-2">
                <p className="text-2xl font-bold">
                  {new Intl.NumberFormat('id-ID', {
                    style: 'currency',
                    currency: 'IDR',
                    minimumFractionDigits: 0,
                  }).format(inv.total)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t('dueDate')}: {inv.dueDate}
                </p>
              </div>

              {inv.paymentMethodName && (
                <div className="mb-3 rounded-lg bg-muted p-3 text-sm">
                  <p className="font-medium">{inv.paymentMethodName}</p>
                  {inv.paymentMethodBankName && (
                    <p className="text-muted-foreground">
                      {inv.paymentMethodBankName}
                      {inv.paymentMethodAccountNumber
                        ? ` — ${inv.paymentMethodAccountNumber}`
                        : ''}
                    </p>
                  )}
                  {inv.paymentMethodAccountHolder && (
                    <p className="text-muted-foreground">
                      {inv.paymentMethodAccountHolder}
                    </p>
                  )}
                  {inv.paymentMethodInstructions && (
                    <p className="mt-1 text-muted-foreground">
                      {inv.paymentMethodInstructions}
                    </p>
                  )}
                </div>
              )}

              {isUnpaid && (
                <div>
                  <input
                    type="file"
                    id={`proof-${inv.id}`}
                    className="hidden"
                    accept="image/*,application/pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        setUploadingId(inv.id)
                        onUpload(inv.id, file)
                          .then(() => {
                            toast.success(t('pendingConfirmation'))
                          })
                          .catch(() => {
                            toast.error('Upload failed')
                          })
                          .finally(() => {
                            setUploadingId(null)
                          })
                      }
                    }}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={uploadingId === inv.id}
                    onClick={() =>
                      document.getElementById(`proof-${inv.id}`)?.click()
                    }
                  >
                    {uploadingId === inv.id ? (
                      <Clock className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="mr-2 h-4 w-4" />
                    )}
                    {t('uploadProof')}
                  </Button>
                </div>
              )}

              {isPending && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  {t('pendingConfirmation')}
                </div>
              )}

              <div className="mt-2">
                <a
                  href={`/api/documents/invoices/token/${inv.id}`}
                  className="text-xs text-primary underline hover:no-underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <FileText className="mr-1 inline h-3 w-3" />
                  {t('downloadInvoice')}
                </a>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
