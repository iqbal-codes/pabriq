import { z } from 'zod'

const emailSchema = z.email()

const productAddonSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  unitSurcharge: z
    .number({ message: 'Surcharge is required' })
    .min(0, 'Unit surcharge must not be negative'),
})

const pricingBreakpointSchema = z.object({
  minQuantity: z.number().min(1, 'Min quantity must be at least 1'),
  unitPrice: z
    .number({ message: 'Price is required' })
    .min(0, 'Unit price must not be negative'),
})

export const productFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string(),
  priority: z.boolean(),
  primaryImageAssetId: z.string().nullable(),
  basePrice: z
    .number({ message: 'Price is required' })
    .min(0, 'Base price must not be negative'),
  productionDays: z.number().min(1, 'Production days must be at least 1'),
  minQuantity: z.number().min(1, 'Minimum quantity must be at least 1'),
  maxQuantity: z.union([z.number(), z.undefined()]),
  negotiateAboveQuantity: z.union([z.number(), z.undefined()]),
  repeatOrderUnitPrice: z.union([z.number(), z.undefined()]),
  repeatOrderMinQuantity: z.union([z.number(), z.undefined()]),
  maxProductionQuantity: z.union([z.number(), z.undefined()]),
  pricingMode: z.enum(['interpolated', 'step']),
  pricingBreakpoints: z
    .array(pricingBreakpointSchema)
    .superRefine((bps, ctx) => {
      for (let i = 1; i < bps.length; i++) {
        if (bps[i].minQuantity <= bps[i - 1].minQuantity) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Must be greater than ${bps[i - 1].minQuantity}`,
            path: [i, 'minQuantity'],
          })
        }
      }
    }),
  productAddons: z.array(productAddonSchema),
})

export const customerFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.union([z.literal(''), emailSchema]),
  phone: z
    .string()
    .min(1, 'Phone number is required')
    .regex(/^\d{8,16}$/, 'Phone number must be between 8 and 16 digits'),
  notes: z.string(),
  active: z.boolean(),
  isWni: z.boolean(),
  photoAssetId: z.string().nullable(),
  address: z.object({
    areaId: z.string(),
    areaName: z.string(),
    streetAddress: z.string(),
  }),
})
const orderLineItemFormSchema = z
  .object({
    id: z.string(),
    productId: z.string(),
    quantity: z
      .union([z.number(), z.string()])
      .refine((v) => {
        if (typeof v === 'string' && v.trim() === '') return false
        return true
      }, 'Quantity is required')
      .refine((v) => {
        const n = typeof v === 'number' ? v : Number.parseInt(v, 10)
        return Number.isFinite(n) && n > 0
      }, 'Quantity must be greater than zero'),
    unitPrice: z.union([z.number(), z.string()]),
    designName: z.string(),
    notes: z.string(),
    attachments: z.array(z.string()),
    addonIds: z.array(z.string()),
    isRepeatOrder: z.boolean(),
    deadline: z.string(),
    manualDeadline: z.boolean(),
  })
  .refine((item) => !item.manualDeadline || item.deadline.length > 0, {
    message: 'Manual deadline is required',
    path: ['deadline'],
  })

export const orderFormSchema = z.object({
  customerId: z.string().min(1, 'Customer is required'),
  notes: z.string(),
  address: z.object({
    areaId: z.string(),
    areaName: z.string(),
    streetAddress: z.string(),
  }),
  lineItems: z
    .array(orderLineItemFormSchema)
    .min(1, 'Add at least one product'),
})
