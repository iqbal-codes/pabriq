export type Money = {
  amount: number
  currency: string
}

export type Breakpoint = {
  minQuantity: number
  unitPrice: number
}

export type PricingInput = {
  quantity: number
  breakpoints: Breakpoint[]
  manualUnitPrice?: number
  currency?: string
  mode?: 'interpolated' | 'step'
}

export type PricingSuccess = {
  unitPrice: Money
  lineTotal: Money
}

export type PricingError = {
  code: 'NO_BREAKPOINTS' | 'INVALID_QUANTITY' | 'NO_MATCHING_BREAKPOINT'
  message: string
}

export type PricingResult = PricingSuccess | PricingError

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100
}

export function calculateUnitPrice(input: PricingInput): PricingResult {
  if (input.breakpoints.length === 0) {
    return {
      code: 'NO_BREAKPOINTS',
      message: 'No pricing breakpoints configured',
    }
  }

  if (input.quantity <= 0) {
    return {
      code: 'INVALID_QUANTITY',
      message: 'Quantity must be greater than zero',
    }
  }

  const currency = input.currency ?? 'USD'

  if (input.manualUnitPrice !== undefined) {
    const unitPrice = roundMoney(input.manualUnitPrice)
    const total = roundMoney(unitPrice * input.quantity)
    return {
      unitPrice: { amount: unitPrice, currency },
      lineTotal: { amount: total, currency },
    }
  }

  const sorted = input.breakpoints.toSorted(
    (a, b) => a.minQuantity - b.minQuantity,
  )

  for (let i = 0; i < sorted.length; i++) {
    const bp = sorted[i]

    if (bp.minQuantity === input.quantity) {
      const total = roundMoney(bp.unitPrice * input.quantity)
      return {
        unitPrice: { amount: bp.unitPrice, currency },
        lineTotal: { amount: total, currency },
      }
    }

    if (bp.minQuantity > input.quantity) {
      if (i === 0) {
        return {
          code: 'NO_MATCHING_BREAKPOINT',
          message: 'Quantity below minimum breakpoint',
        }
      }

      const prev = sorted[i - 1]

      if (input.mode === 'step') {
        const total = roundMoney(prev.unitPrice * input.quantity)
        return {
          unitPrice: { amount: prev.unitPrice, currency },
          lineTotal: { amount: total, currency },
        }
      }

      const t =
        (input.quantity - prev.minQuantity) /
        (bp.minQuantity - prev.minQuantity)
      const interpolated = roundMoney(
        prev.unitPrice + t * (bp.unitPrice - prev.unitPrice),
      )
      const total = roundMoney(interpolated * input.quantity)
      return {
        unitPrice: { amount: interpolated, currency },
        lineTotal: { amount: total, currency },
      }
    }
  }

  const last = sorted[sorted.length - 1]
  const total = roundMoney(last.unitPrice * input.quantity)
  return {
    unitPrice: { amount: last.unitPrice, currency },
    lineTotal: { amount: total, currency },
  }
}
