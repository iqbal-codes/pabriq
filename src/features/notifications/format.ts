import type { Messages } from '#/messages'
import type { ActionNotification } from './model'

export type NotificationKey = keyof Messages['notifications']
export type NotificationT = (
  key: NotificationKey,
  values?: Record<string, string | number>,
) => string

export function formatActionNotification({
  item,
  t,
  formatAmount,
}: {
  item: ActionNotification
  t: NotificationT
  formatAmount: (amount: number) => string
}): { label: string; message: string } {
  if (item.type === 'payment_confirmation') {
    const customerName = item.context.customerName
    const invoiceNumber = item.context.invoiceNumber
    const amountStr = formatAmount(item.context.amount)

    return {
      label: t('paymentConfirmationLabel'),
      message: t('paymentConfirmationMessage', {
        customerName,
        amount: amountStr,
        invoiceNumber,
      }),
    }
  }

  if (item.type === 'order_review') {
    const customerName = item.context.customerName ?? t('noCustomer')
    const orderNumber = item.context.orderNumber ?? t('noOrderNumber')

    return {
      label: t('orderReviewLabel'),
      message: t('orderReviewMessage', {
        customerName,
        orderNumber,
      }),
    }
  }

  if (item.type === 'dp_invoice_request') {
    const customerName = item.context.customerName ?? t('noCustomer')
    const orderNumber = item.context.orderNumber ?? t('noOrderNumber')
    const stageName =
      item.context.firstProductionStageName ?? t('productionStageFallback')

    return {
      label: t('dpInvoiceLabel'),
      message: t('dpInvoiceMessage', {
        customerName,
        orderNumber,
        stageName,
      }),
    }
  }

  if (item.type === 'final_invoice_request') {
    const customerName = item.context.customerName ?? t('noCustomer')
    const orderNumber = item.context.orderNumber ?? t('noOrderNumber')

    return {
      label: t('finalInvoiceLabel'),
      message: t('finalInvoiceMessage', {
        customerName,
        orderNumber,
      }),
    }
  }

  // task_review
  const taskNumber = item.context.taskNumber ?? t('noTaskNumber')
  const stageName = item.context.stageName ?? t('noStage')

  return {
    label: t('taskReviewLabel'),
    message: t('taskReviewMessage', {
      taskNumber,
      stageName,
    }),
  }
}
