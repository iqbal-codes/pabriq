import { vi } from 'vitest'

vi.mock('#/features/channels/components/channels-settings-page', () => ({
  default: () => null,
  ChannelsSettingsPage: () => null,
}))

import { describe, expect, it } from 'vitest'
import { Route } from './channels'

type BeforeLoadArgs = Parameters<
  NonNullable<typeof Route.options.beforeLoad>
>[0]

describe('channels route guard', () => {
  it('redirects member role away from channels settings', () => {
    const beforeLoad = Route.options.beforeLoad
    expect(beforeLoad).toBeDefined()
    if (!beforeLoad) {
      throw new Error('Expected beforeLoad to be defined')
    }
    expect(() =>
      beforeLoad({
        context: { org: { role: 'member' } },
      } as BeforeLoadArgs),
    ).toThrow()
  })

  it('allows owner to access channels settings', () => {
    const beforeLoad = Route.options.beforeLoad
    expect(beforeLoad).toBeDefined()
    if (!beforeLoad) {
      throw new Error('Expected beforeLoad to be defined')
    }
    const result = beforeLoad({
      context: { org: { role: 'owner' } },
    } as BeforeLoadArgs)
    expect(result).toEqual({
      breadcrumb: 'channels',
      pageTitle: 'channels',
    })
  })

  it('allows admin to access channels settings', () => {
    const beforeLoad = Route.options.beforeLoad
    expect(beforeLoad).toBeDefined()
    if (!beforeLoad) {
      throw new Error('Expected beforeLoad to be defined')
    }
    const result = beforeLoad({
      context: { org: { role: 'admin' } },
    } as BeforeLoadArgs)
    expect(result).toEqual({
      breadcrumb: 'channels',
      pageTitle: 'channels',
    })
  })
})
