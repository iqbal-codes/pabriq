export type Role = 'owner' | 'admin' | 'member' | 'operator'

export function isOperator(role: Role): role is 'operator' {
  return role === 'operator'
}

export function canManageMembers(role: Role): boolean {
  return role === 'owner' || role === 'admin'
}

export function canManageProducts(role: Role): boolean {
  return role === 'owner' || role === 'admin'
}

export function canCreateOrders(role: Role): boolean {
  return role === 'owner' || role === 'admin' || role === 'member'
}

export function canApproveOrders(role: Role): boolean {
  return role === 'owner' || role === 'admin'
}

export function canManageInvoices(role: Role): boolean {
  return role === 'owner' || role === 'admin'
}

export function canAdvanceProductionTask(role: Role): boolean {
  return (
    role === 'owner' ||
    role === 'admin' ||
    role === 'member' ||
    role === 'operator'
  )
}

export function canApproveProductionTask(role: Role): boolean {
  return role === 'owner' || role === 'admin'
}

export function canManageCustomers(role: Role): boolean {
  return role === 'owner' || role === 'admin'
}

export function canViewProduction(role: Role): boolean {
  return (
    role === 'owner' ||
    role === 'admin' ||
    role === 'member' ||
    role === 'operator'
  )
}

export function canViewOrders(role: Role): boolean {
  return (
    role === 'owner' ||
    role === 'admin' ||
    role === 'member' ||
    role === 'operator'
  )
}

export function canManageStages(role: Role): boolean {
  return role === 'owner' || role === 'admin'
}

export function canManageDevices(role: Role): boolean {
  return role === 'owner' || role === 'admin'
}
export function canViewActionNotifications(role: Role): boolean {
  return role === 'owner' || role === 'admin'
}

export function canManageSettings(role: Role): boolean {
  return role === 'owner' || role === 'admin'
}

export function canManagePaymentSettings(role: Role): boolean {
  return role === 'owner' || role === 'admin'
}

export function canAdjustConfirmedOrder(role: Role): boolean {
  return role === 'owner' || role === 'admin'
}
export function canUseAssistant(role: Role): boolean {
  return role === 'owner' || role === 'admin'
}

/**
 * Check whether a user is a platform administrator (operates outside org membership).
 */
export async function isPlatformAdmin(userId: string): Promise<boolean> {
  const [{ db }, { platformAdminUsers }, { and, eq, isNull }] =
    await Promise.all([
      import('#/db/index'),
      import('#/db/schema'),
      import('drizzle-orm'),
    ])

  const [record] = await db
    .select({ id: platformAdminUsers.id })
    .from(platformAdminUsers)
    .where(
      and(
        eq(platformAdminUsers.userId, userId),
        isNull(platformAdminUsers.revokedAt),
      ),
    )
    .limit(1)

  return !!record
}
