import { describe, expect, it } from 'vitest'
import { adminSummary } from './model'

const validRoles = ['Owner', 'Admin', 'Operator'] as const
const validUserStatuses = ['Active', 'Invited', 'Suspended'] as const
const validActionStatuses = ['Ready', 'Review', 'Blocked'] as const

describe('adminSummary', () => {
  it('has required metrics', () => {
    expect(adminSummary.metrics).toBeDefined()
    expect(Array.isArray(adminSummary.metrics)).toBe(true)
    expect(adminSummary.metrics.length).toBeGreaterThan(0)
  })

  it('has required users', () => {
    expect(adminSummary.users).toBeDefined()
    expect(Array.isArray(adminSummary.users)).toBe(true)
    expect(adminSummary.users.length).toBeGreaterThan(0)
  })

  it('has required actions', () => {
    expect(adminSummary.actions).toBeDefined()
    expect(Array.isArray(adminSummary.actions)).toBe(true)
    expect(adminSummary.actions.length).toBeGreaterThan(0)
  })

  it('metrics have required fields', () => {
    for (const metric of adminSummary.metrics) {
      expect(metric.label).toBeDefined()
      expect(typeof metric.label).toBe('string')
      expect(metric.value).toBeDefined()
      expect(typeof metric.value).toBe('string')
      expect(metric.detail).toBeDefined()
      expect(typeof metric.detail).toBe('string')
    }
  })

  it('users have required fields', () => {
    for (const user of adminSummary.users) {
      expect(user.id).toBeDefined()
      expect(typeof user.id).toBe('string')
      expect(user.name).toBeDefined()
      expect(typeof user.name).toBe('string')
      expect(user.email).toBeDefined()
      expect(typeof user.email).toBe('string')
      expect(user.role).toBeDefined()
      expect(validRoles).toContain(user.role)
      expect(user.status).toBeDefined()
      expect(validUserStatuses).toContain(user.status)
    }
  })

  it('actions have required fields', () => {
    for (const action of adminSummary.actions) {
      expect(action.id).toBeDefined()
      expect(typeof action.id).toBe('string')
      expect(action.title).toBeDefined()
      expect(typeof action.title).toBe('string')
      expect(action.owner).toBeDefined()
      expect(typeof action.owner).toBe('string')
      expect(action.status).toBeDefined()
      expect(validActionStatuses).toContain(action.status)
    }
  })
})