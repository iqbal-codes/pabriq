import { z } from 'zod'

const emailSchema = z.email()
const phoneNumberSchema = z.string().regex(/^\d{8,16}$/)

const pricingBreakpointSchema = z.object({
  minQuantity: z.number().min(1, 'Min quantity must be at least 1'),
  unitPrice: z.number().min(0, 'Unit price must not be negative'),
})

export const productFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string(),
  productionNotes: z.string(),
  primaryImageAssetId: z.string().nullable(),
  basePrice: z.number(),
  productionDays: z.number(),
  minQuantity: z.number(),
  maxQuantity: z.union([z.number(), z.undefined()]),
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
})

export const customerFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.union([z.literal(''), emailSchema]),
  phone: z.union([z.literal(''), phoneNumberSchema]),
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
