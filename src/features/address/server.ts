import { createServerFn } from '@tanstack/react-start'

export const searchAreasFn = createServerFn({ method: 'GET' })
  .inputValidator((input: { query: string }) => input)
  .handler(async ({ data }) => {
    const { searchAreas } = await import('./model')
    return searchAreas(data.query)
  })
