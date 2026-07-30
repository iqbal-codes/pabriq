export type CourierServiceOption = {
  code: string
  name: string
  description?: string
}

export type CourierServiceInfo = {
  code: string
  name: string
  services: CourierServiceOption[]
}

export type ShippingFeeEstimateInput = {
  courier: string
  service?: string
  originAreaId?: string
  destinationAreaId?: string
  weightGrams?: number
}

export type ShippingFeeEstimate = {
  courier: string
  service: string
  fee: number
  estimatedDays?: string
}

export type CourierTrackingEvent = {
  timestamp: string
  status: string
  note: string
}

export type CourierTrackingInfo = {
  courier: string
  trackingNumber: string
  status: string
  trackingUrl: string | null
  history: CourierTrackingEvent[]
}

export interface CourierAdapter {
  id: string
  name: string
  getSupportedCouriers(): CourierServiceInfo[]
  validateTrackingNumber(courier: string, trackingNumber: string): boolean
  getTrackingUrl(courier: string, trackingNumber: string): string | null
  estimateShippingFee(
    input: ShippingFeeEstimateInput,
  ): Promise<ShippingFeeEstimate>
  getTrackingInfo(
    courier: string,
    trackingNumber: string,
  ): Promise<CourierTrackingInfo>
}

export class StandardCourierAdapter implements CourierAdapter {
  id = 'standard'
  name = 'Standard Courier Adapter'

  getSupportedCouriers(): CourierServiceInfo[] {
    return [
      {
        code: 'jne',
        name: 'JNE Express',
        services: [
          { code: 'reg', name: 'Reguler' },
          { code: 'yes', name: 'Yakin Esok Sampai (YES)' },
          { code: 'oke', name: 'Ongkos Kirim Ekonomis (OKE)' },
        ],
      },
      {
        code: 'sicepat',
        name: 'SiCepat Express',
        services: [
          { code: 'reg', name: 'Reguler' },
          { code: 'best', name: 'Besok Sampai Tujuan (BEST)' },
          { code: 'gokil', name: 'Cargo (GOKIL)' },
        ],
      },
      {
        code: 'jnt',
        name: 'J&T Express',
        services: [
          { code: 'ez', name: 'EZ' },
          { code: 'super', name: 'J&T Super' },
        ],
      },
      {
        code: 'gosend',
        name: 'GoSend',
        services: [
          { code: 'instant', name: 'Instant Delivery' },
          { code: 'same_day', name: 'Same Day Delivery' },
        ],
      },
      {
        code: 'pickup',
        name: 'Self Pickup',
        services: [{ code: 'pickup', name: 'Store/Warehouse Pickup' }],
      },
    ]
  }

  validateTrackingNumber(courier: string, trackingNumber: string): boolean {
    const trimmed = trackingNumber.trim()
    if (!trimmed) return false
    if (courier.toLowerCase() === 'pickup') return true
    return trimmed.length >= 4
  }

  getTrackingUrl(courier: string, trackingNumber: string): string | null {
    const c = courier.toLowerCase()
    const tracking = encodeURIComponent(trackingNumber.trim())
    if (!tracking) return null

    if (c.includes('jne')) {
      return `https://www.jne.co.id/tracking/${tracking}`
    }
    if (c.includes('sicepat')) {
      return `https://www.sicepat.com/checkAwb?awb=${tracking}`
    }
    if (c.includes('jnt') || c.includes('j&t')) {
      return `https://jet.co.id/track?awb=${tracking}`
    }
    if (c.includes('pickup')) {
      return null
    }
    return null
  }

  async estimateShippingFee(
    input: ShippingFeeEstimateInput,
  ): Promise<ShippingFeeEstimate> {
    const courier = input.courier || 'jne'
    const service = input.service || 'reg'
    const weightKg = Math.max(1, Math.ceil((input.weightGrams ?? 1000) / 1000))
    const baseFee = courier.toLowerCase() === 'pickup' ? 0 : 15000 * weightKg
    return {
      courier,
      service,
      fee: baseFee,
      estimatedDays: '1-3 days',
    }
  }

  async getTrackingInfo(
    courier: string,
    trackingNumber: string,
  ): Promise<CourierTrackingInfo> {
    return {
      courier,
      trackingNumber,
      status: trackingNumber ? 'in_transit' : 'pending',
      trackingUrl: this.getTrackingUrl(courier, trackingNumber),
      history: trackingNumber
        ? [
            {
              timestamp: new Date().toISOString(),
              status: 'in_transit',
              note: `Package handed to ${courier}`,
            },
          ]
        : [],
    }
  }
}

const defaultAdapter = new StandardCourierAdapter()
const adapterRegistry = new Map<string, CourierAdapter>([
  [defaultAdapter.id, defaultAdapter],
])

export function getCourierAdapter(adapterId?: string): CourierAdapter {
  if (adapterId) {
    const registered = adapterRegistry.get(adapterId)
    if (registered) return registered
  }
  return defaultAdapter
}

export function registerCourierAdapter(adapter: CourierAdapter): void {
  adapterRegistry.set(adapter.id, adapter)
}
