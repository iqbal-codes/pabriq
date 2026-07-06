import { describe, expect, it, vi } from 'vitest'
import { getReadyForProductionLabel } from './ready-for-production-label'

describe('getReadyForProductionLabel', () => {
  it('formats label with first production stage when present', () => {
    const readyForProductionWithStage = vi.fn(
      ({ stage }: { stage: string }) => `Queue for ${stage}`,
    )

    const result = getReadyForProductionLabel({
      firstProductionStageName: 'Printing',
      readyForProduction: 'DP Payment',
      readyForProductionWithStage,
    })

    expect(result).toBe('Queue for Printing')
    expect(readyForProductionWithStage).toHaveBeenCalledWith({
      stage: 'Printing',
    })
  })

  it('falls back to readyForProduction when first production stage is missing', () => {
    const readyForProductionWithStage = vi.fn(
      ({ stage }: { stage: string }) => `Queue for ${stage}`,
    )

    const result = getReadyForProductionLabel({
      firstProductionStageName: undefined,
      readyForProduction: 'DP Payment',
      readyForProductionWithStage,
    })

    expect(result).toBe('DP Payment')
    expect(readyForProductionWithStage).not.toHaveBeenCalled()
  })
})
