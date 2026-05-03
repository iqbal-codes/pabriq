import { z } from 'zod'

export const emailSchema = z.email()
export const phoneNumberSchema = z.string().regex(/^\d{8,16}$/)

export const customerFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.union([z.literal(''), emailSchema]),
  phone: z.union([z.literal(''), phoneNumberSchema]),
  notes: z.string(),
  active: z.boolean(),
  photoAssetId: z.string().nullable(),
})
