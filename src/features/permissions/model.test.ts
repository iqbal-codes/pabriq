import { describe, expect, it } from 'vitest'
import {
  canAdjustConfirmedOrder,
  canAdvanceProductionTask,
  canApproveOrders,
  canApproveProductionTask,
  canCreateOrders,
  canManageCustomers,
  canManageInvoices,
  canManageMembers,
  canManagePaymentSettings,
  canManageProducts,
  canManageSettings,
  canManageStages,
  canUseAssistant,
  canViewProduction,
  type Role,
} from './model'

const roles: Role[] = ['owner', 'admin', 'member']

function expectPermissions(fn: (role: Role) => boolean, allowed: Role[]) {
  for (const role of roles) {
    const expected = allowed.includes(role)
    expect(fn(role), `role=${role}`).toBe(expected)
  }
}

describe('canManageMembers', () => {
  it('allows owner and admin', () => {
    expectPermissions(canManageMembers, ['owner', 'admin'])
  })
})

describe('canManageProducts', () => {
  it('allows owner and admin', () => {
    expectPermissions(canManageProducts, ['owner', 'admin'])
  })
})

describe('canCreateOrders', () => {
  it('allows owner, admin, and member', () => {
    expectPermissions(canCreateOrders, ['owner', 'admin', 'member'])
  })
})

describe('canApproveOrders', () => {
  it('allows owner and admin', () => {
    expectPermissions(canApproveOrders, ['owner', 'admin'])
  })
})

describe('canManageInvoices', () => {
  it('allows owner and admin', () => {
    expectPermissions(canManageInvoices, ['owner', 'admin'])
  })
})

describe('canAdvanceProductionTask', () => {
  it('allows owner, admin, and member', () => {
    expectPermissions(canAdvanceProductionTask, ['owner', 'admin', 'member'])
  })
})

describe('canApproveProductionTask', () => {
  it('allows owner and admin', () => {
    expectPermissions(canApproveProductionTask, ['owner', 'admin'])
  })
})

describe('canViewProduction', () => {
  it('allows owner, admin, and member', () => {
    expectPermissions(canViewProduction, ['owner', 'admin', 'member'])
  })
})

describe('canManageStages', () => {
  it('allows owner and admin', () => {
    expectPermissions(canManageStages, ['owner', 'admin'])
  })
})

describe('canManageCustomers', () => {
  it('allows owner and admin', () => {
    expectPermissions(canManageCustomers, ['owner', 'admin'])
  })
})

describe('canManageSettings', () => {
  it('allows owner and admin', () => {
    expectPermissions(canManageSettings, ['owner', 'admin'])
  })
})
describe('canAdjustConfirmedOrder', () => {
  it('allows owner and admin', () => {
    expectPermissions(canAdjustConfirmedOrder, ['owner', 'admin'])
  })
})
describe('canUseAssistant', () => {
  it('allows owner and admin only', () => {
    expectPermissions(canUseAssistant, ['owner', 'admin'])
  })
})

describe('canManagePaymentSettings', () => {
  it('allows owner and admin only', () => {
    expectPermissions(canManagePaymentSettings, ['owner', 'admin'])
  })
})
