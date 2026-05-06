export type Role = 'owner' | 'admin' | 'member'

export function canManageMembers(role: Role): boolean {
  return role === 'owner'
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
  return role === 'owner' || role === 'admin' || role === 'member'
}

export function canApproveProductionTask(role: Role): boolean {
  return role === 'owner' || role === 'admin'
}

export function canManageCustomers(role: Role): boolean {
  return role === 'owner' || role === 'admin'
}

export function canViewProduction(role: Role): boolean {
  return role === 'owner' || role === 'admin' || role === 'member'
}

export function canManageStages(role: Role): boolean {
  return role === 'owner' || role === 'admin'
}
