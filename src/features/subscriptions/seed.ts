import { sql } from 'drizzle-orm'
import { db } from '#/db/index'
import type { PlanEntitlements } from '#/db/schema'
import { plans } from '#/db/schema'

const DEFAULT_PLANS: Array<{
  slug: string
  name: string
  version: number
  description: string
  monthlyPriceCents: number
  annualPriceCents: number
  entitlements: PlanEntitlements
}> = [
  {
    slug: 'starter',
    name: 'Starter',
    version: 1,
    description: 'For small operations getting started',
    monthlyPriceCents: 0,
    annualPriceCents: 0,
    entitlements: {
      maxOrders: 50,
      maxProducts: 20,
      maxCustomers: 50,
      maxMembers: 3,
      maxStorageBytes: 500_000_000, // 500MB
      features: ['basic_orders', 'basic_production'],
      warningThresholds: {
        orders: 0.8,
        products: 0.8,
        customers: 0.8,
        members: 0.8,
        storage: 0.8,
      },
    },
  },
  {
    slug: 'growth',
    name: 'Growth',
    version: 1,
    description: 'For growing businesses with increased capacity',
    monthlyPriceCents: 2900,
    annualPriceCents: 29000,
    entitlements: {
      maxOrders: 500,
      maxProducts: 100,
      maxCustomers: 500,
      maxMembers: 10,
      maxStorageBytes: 5_000_000_000, // 5GB
      features: [
        'basic_orders',
        'basic_production',
        'invoicing',
        'advanced_pricing',
      ],
      warningThresholds: {
        orders: 0.8,
        products: 0.8,
        customers: 0.8,
        members: 0.8,
        storage: 0.8,
      },
    },
  },
  {
    slug: 'scale',
    name: 'Scale',
    version: 1,
    description: 'Unlimited capacity for large operations',
    monthlyPriceCents: 7900,
    annualPriceCents: 79000,
    entitlements: {
      maxOrders: null,
      maxProducts: null,
      maxCustomers: null,
      maxMembers: null,
      maxStorageBytes: null,
      features: [
        'basic_orders',
        'basic_production',
        'invoicing',
        'advanced_pricing',
        'api',
        'priority_support',
      ],
      warningThresholds: {},
    },
  },
]

export async function seedDefaultPlans(): Promise<void> {
  for (const plan of DEFAULT_PLANS) {
    const existing = await db
      .select({ id: plans.id })
      .from(plans)
      .where(
        sql`${plans.slug} = ${plan.slug} AND ${plans.version} = ${plan.version}`,
      )
      .limit(1)

    if (existing.length === 0) {
      await db.insert(plans).values({
        id: crypto.randomUUID(),
        ...plan,
      })
    }
  }
}
