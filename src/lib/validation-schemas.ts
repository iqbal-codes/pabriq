import { z } from 'zod'

export const emailSchema = z.email()
export const phoneNumberSchema = z.string().regex(/^\d{8,16}$/)

export const productFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string(),
  productionNotes: z.string(),
  basePrice: z.number(),
  productionDays: z.number(),
  minQuantity: z.number(),
  maxQuantity: z.union([z.number(), z.undefined()]),
})

export const customerFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.union([z.literal(''), emailSchema]),
  phone: z.union([z.literal(''), phoneNumberSchema]),
  notes: z.string(),
  active: z.boolean(),
  photoAssetId: z.string().nullable(),
  address: z.object({
    areaId: z.string(),
    areaName: z.string(),
    streetAddress: z.string(),
  }),
})
