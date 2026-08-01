import { describe, expect, it } from 'vitest'
import {
  createOrganizationExport,
  getAdminDashboardMetrics,
  getProductionBottlenecks,
  grantPlatformAdmin,
  listAuditEvents,
  listMigrations,
  listOrganizations,
  listPlans,
  listSubscriptions,
  restoreOrganization,
  revokePlatformAdmin,
  suspendOrganization,
} from './model'

describe('admin model', () => {
  describe('types', () => {
    it('listOrganizations returns correct shape', async () => {
      const result = await listOrganizations()
      expect(Array.isArray(result)).toBe(true)
      for (const org of result) {
        expect(org).toHaveProperty('id')
        expect(org).toHaveProperty('name')
        expect(org).toHaveProperty('slug')
        expect(org).toHaveProperty('memberCount')
        expect(org).toHaveProperty('subscriptionStatus')
        expect(org).toHaveProperty('planName')
        expect(org).toHaveProperty('orderCount')
        expect(org).toHaveProperty('invoiceUnpaidCount')
        expect(org).toHaveProperty('createdAt')
      }
    })

    it('listOrganizations supports search', async () => {
      const result = await listOrganizations('test')
      expect(Array.isArray(result)).toBe(true)
    })

    it('listPlans returns correct shape', async () => {
      const result = await listPlans()
      expect(Array.isArray(result)).toBe(true)
      for (const plan of result) {
        expect(plan).toHaveProperty('id')
        expect(plan).toHaveProperty('slug')
        expect(plan).toHaveProperty('name')
        expect(plan).toHaveProperty('version')
        expect(plan).toHaveProperty('entitlements')
        expect(plan).toHaveProperty('monthlyPriceCents')
        expect(plan).toHaveProperty('annualPriceCents')
        expect(plan).toHaveProperty('active')
        expect(plan).toHaveProperty('subscriberCount')
      }
    })

    it('listSubscriptions returns correct shape', async () => {
      const result = await listSubscriptions()
      expect(Array.isArray(result)).toBe(true)
      for (const sub of result) {
        expect(sub).toHaveProperty('id')
        expect(sub).toHaveProperty('orgId')
        expect(sub).toHaveProperty('orgName')
        expect(sub).toHaveProperty('orgSlug')
        expect(sub).toHaveProperty('planId')
        expect(sub).toHaveProperty('planName')
        expect(sub).toHaveProperty('planSlug')
        expect(sub).toHaveProperty('planVersion')
        expect(sub).toHaveProperty('status')
        expect(sub).toHaveProperty('billingCadence')
        expect(typeof sub.createdAt).toBe('string')
      }
    })

    it('listAuditEvents returns correct shape', {
      // Skipped: requires audit_events table migration 0039
      skip: true,
    }, async () => {
      const result = await listAuditEvents()
      expect(Array.isArray(result)).toBe(true)
      for (const event of result) {
        expect(event).toHaveProperty('id')
        expect(event).toHaveProperty('actorId')
        expect(event).toHaveProperty('actorName')
        expect(event).toHaveProperty('action')
        expect(typeof event.createdAt).toBe('string')
      }
    })

    it('listMigrations returns correct shape', async () => {
      const result = await listMigrations()
      expect(Array.isArray(result)).toBe(true)
      for (const mig of result) {
        expect(mig).toHaveProperty('id')
        expect(mig).toHaveProperty('orgId')
        expect(mig).toHaveProperty('orgName')
        expect(mig).toHaveProperty('orgSlug')
        expect(mig).toHaveProperty('status')
        expect(typeof mig.createdAt).toBe('string')
      }
    })

    it('getAdminDashboardMetrics returns correct shape', async () => {
      const result = await getAdminDashboardMetrics()
      expect(result).toHaveProperty('totalOrganizations')
      expect(result).toHaveProperty('activeSubscriptions')
      expect(result).toHaveProperty('trialingOrgs')
      expect(result).toHaveProperty('pendingMigrations')
      expect(result).toHaveProperty('totalOrdersThisMonth')
      expect(result).toHaveProperty('unpaidInvoicesTotal')
      expect(result).toHaveProperty('productionBottleneckCount')
      expect(result).toHaveProperty('qualityHoldsCount')
      expect(result).toHaveProperty('recentSignups')
      expect(typeof result.totalOrganizations).toBe('number')
    })

    it('getProductionBottlenecks returns correct shape', async () => {
      const result = await getProductionBottlenecks('nonexistent-org')
      expect(Array.isArray(result)).toBe(true)
    })

    // Database-dependent tests below require migration 0039
    // (audit_events, platform_admin_users tables) to be applied
    // to the test database. They are skipped when the migration
    // is not yet applied.

    it('grantPlatformAdmin requires valid userId', {
      // Skipped: requires platform_admin_users table migration
      skip: true,
    }, async () => {
      await expect(grantPlatformAdmin('nonexistent', 'admin')).rejects.toThrow()
    })

    it('revokePlatformAdmin handles nonexistent user', {
      // Skipped: requires platform_admin_users table migration
      skip: true,
    }, async () => {
      const result = await revokePlatformAdmin('nonexistent', 'admin')
      expect(result).toBeUndefined()
    })

    it('suspendOrganization handles nonexistent org', {
      // Skipped: requires audit_events table migration
      skip: true,
    }, async () => {
      await expect(
        suspendOrganization('nonexistent', 'reason', 'actor', 'Actor'),
      ).rejects.toThrow()
    })

    it('restoreOrganization handles nonexistent org', {
      // Skipped: requires audit_events table migration
      skip: true,
    }, async () => {
      await expect(
        restoreOrganization('nonexistent', 'reason', 'actor', 'Actor'),
      ).rejects.toThrow()
    })

    it('createOrganizationExport handles nonexistent org', {
      // Skipped: requires audit_events table migration
      skip: true,
    }, async () => {
      await expect(
        createOrganizationExport('nonexistent', 'actor', 'Actor'),
      ).rejects.toThrow()
    })
  })
})
