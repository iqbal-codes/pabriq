import { describe, expect, it } from 'vitest'
import { Route } from './production-stages'

type BeforeLoadArgs = Parameters<
  NonNullable<typeof Route.options.beforeLoad>
>[0]

describe('production-stages route', () => {
  it('redirects member away from production-stages settings', () => {
    const beforeLoad = Route.options.beforeLoad
    expect(beforeLoad).toBeDefined()
    expect(() =>
      beforeLoad!({
        context: { org: { role: 'member' } },
      } as BeforeLoadArgs),
    ).toThrow()
  })

  it('allows owner to access production-stages settings', () => {
    const beforeLoad = Route.options.beforeLoad
    expect(beforeLoad).toBeDefined()
    const result = beforeLoad!({
      context: { org: { role: 'owner' } },
    } as BeforeLoadArgs)
    expect(result).toEqual({
      breadcrumb: 'productionStages',
      pageTitle: 'productionStages',
    })
  })

  it('allows admin to access production-stages settings', () => {
    const beforeLoad = Route.options.beforeLoad
    expect(beforeLoad).toBeDefined()
    const result = beforeLoad!({
      context: { org: { role: 'admin' } },
    } as BeforeLoadArgs)
    expect(result).toEqual({
      breadcrumb: 'productionStages',
      pageTitle: 'productionStages',
    })
  })
})
