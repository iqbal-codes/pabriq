import { createServerFn } from '@tanstack/react-start'
import { canViewActionNotifications } from '#/features/permissions/model'
import { resolveOrgContext } from '#/lib/auth-session'
import type { ListActionNotificationsResult } from './model'
import { listActionNotifications } from './model'

const EMPTY_COUNTS = {
  payment_confirmation: 0,
  order_review: 0,
  dp_invoice_request: 0,
  final_invoice_request: 0,
  task_review: 0,
} as const

const EMPTY_RESULT: ListActionNotificationsResult = {
  items: [],
  totalCount: 0,
  counts: { ...EMPTY_COUNTS },
}

export const listActionNotificationsFn = createServerFn({ method: 'GET' })
  .inputValidator((input: { limit?: number }) => input)
  .handler(async ({ data }): Promise<ListActionNotificationsResult> => {
    const context = await resolveOrgContext()
    if (!context.ok) {
      if (context.reason === 'unauthenticated') {
        throw new Error('Not authenticated')
      }
      throw new Error('No organization')
    }

    if (!canViewActionNotifications(context.role)) {
      return EMPTY_RESULT
    }

    return listActionNotifications({
      orgId: context.org.id,
      limit: data.limit,
    })
  })
