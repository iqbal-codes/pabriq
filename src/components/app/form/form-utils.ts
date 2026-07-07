import type { z } from 'zod'

type NumericDisplayValue = string | number

export function stripNonDigits(value: NumericDisplayValue): string {
  return String(value).replace(/\D/g, '')
}

const PHONE_GROUP = /^(\d{0,3})(\d{0,4})(\d{0,4})(\d{0,4})/

export function formatPhone(displayValue: string): string {
  const digits = stripNonDigits(displayValue)
  const match = digits.match(PHONE_GROUP)
  if (!match) return digits
  const parts = [match[1], match[2], match[3], match[4]].filter(Boolean)
  return parts.join('-')
}

const numberFormatter = new Intl.NumberFormat('id-ID')

export function formatNumber(displayValue: NumericDisplayValue): string {
  const digits = stripNonDigits(displayValue)
  if (!digits) return ''
  return numberFormatter.format(Number(digits))
}

export function stripNumberFormatting(
  displayValue: NumericDisplayValue,
): string {
  return stripNonDigits(displayValue)
}

export function firstError(errors: Array<unknown>): string | null {
  const error = errors[0]
  if (!error) return null
  if (typeof error === 'string') return error
  if (error instanceof Error) return error.message
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
  )
    return error.message
  return String(error)
}

function getDef(
  s: unknown,
): { type?: string; typeName?: string; [key: string]: unknown } | undefined {
  if (s && typeof s === 'object') {
    const candidateDef = ('def' in s && s.def) || ('_def' in s && s._def)
    if (candidateDef && typeof candidateDef === 'object') {
      // Cast to standard definition object type to read type information
      const defObj = candidateDef as {
        type?: string
        typeName?: string
        [key: string]: unknown
      }
      return defObj
    }
  }
  return undefined
}

function unwrap(s: unknown): unknown {
  if (!s) return s
  let current: unknown = s
  while (current) {
    const def = getDef(current)
    if (!def) break
    const typeName = def.type || def.typeName
    if (typeName === 'optional' || typeName === 'ZodOptional') {
      if ('innerType' in def) {
        current = def.innerType
      } else {
        break
      }
    } else if (typeName === 'nullable' || typeName === 'ZodNullable') {
      if ('innerType' in def) {
        current = def.innerType
      } else {
        break
      }
    } else if (typeName === 'pipe' || typeName === 'ZodEffects') {
      if ('in' in def && def.in) {
        current = def.in
      } else if ('schema' in def && def.schema) {
        current = def.schema
      } else {
        break
      }
    } else if (typeName === 'transform' || typeName === 'ZodTransform') {
      if ('innerType' in def && def.innerType) {
        current = def.innerType
      } else if ('schema' in def && def.schema) {
        current = def.schema
      } else {
        break
      }
    } else if (
      current &&
      typeof current === 'object' &&
      'unwrap' in current &&
      typeof current.unwrap === 'function'
    ) {
      // Cast to unwrap-capable object to call the unwrap function
      const unwrapper = current as { unwrap: () => unknown }
      current = unwrapper.unwrap()
    } else {
      break
    }
  }
  return current
}

function isTypeRequired(schema: unknown): boolean {
  if (!schema) return false

  let current: unknown = schema
  while (current) {
    const def = getDef(current)
    if (!def) break
    const typeName = def.type || def.typeName

    if (
      typeName === 'optional' ||
      typeName === 'ZodOptional' ||
      typeName === 'nullable' ||
      typeName === 'ZodNullable' ||
      typeName === 'default' ||
      typeName === 'ZodDefault' ||
      typeName === 'undefined' ||
      typeName === 'ZodUndefined' ||
      typeName === 'null' ||
      typeName === 'ZodNull' ||
      typeName === 'void' ||
      typeName === 'ZodVoid'
    ) {
      return false
    }

    if (typeName === 'pipe' || typeName === 'ZodEffects') {
      if ('in' in def && def.in) {
        current = def.in
      } else if ('schema' in def && def.schema) {
        current = def.schema
      } else {
        break
      }
      continue
    }

    if (typeName === 'transform' || typeName === 'ZodTransform') {
      if ('innerType' in def && def.innerType) {
        current = def.innerType
      } else if ('schema' in def && def.schema) {
        current = def.schema
      } else {
        break
      }
      continue
    }

    if (typeName === 'union' || typeName === 'ZodUnion') {
      if ('options' in def && Array.isArray(def.options)) {
        const options = def.options
        const allRequired = options.every((opt) => isTypeRequired(opt))
        const hasOptionalLiteral = options.some((opt) => {
          const optDef = getDef(opt)
          const optTypeName = optDef ? optDef.type || optDef.typeName : ''
          if (optTypeName === 'literal' || optTypeName === 'ZodLiteral') {
            const value =
              optDef && 'values' in optDef && optDef.values instanceof Set
                ? [...optDef.values][0]
                : optDef && 'value' in optDef
                  ? optDef.value
                  : undefined
            return value === '' || value === null || value === undefined
          }
          return false
        })
        return allRequired && !hasOptionalLiteral
      }
    }

    if (typeName === 'literal' || typeName === 'ZodLiteral') {
      const value =
        def && 'values' in def && def.values instanceof Set
          ? [...def.values][0]
          : def && 'value' in def
            ? def.value
            : undefined
      if (value === '' || value === null || value === undefined) {
        return false
      }
    }

    break
  }

  return true
}

export function isZodFieldRequired(schema: unknown, path: string): boolean {
  if (!schema) return false

  const parts = path.split('.')
  if (parts.length === 0) return false

  let currentSchema: unknown = schema
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]
    const cleanPart = part.replace(/\[\d+\]/g, '')

    const unwrapped = unwrap(currentSchema)
    if (!unwrapped) return false

    const def = getDef(unwrapped)
    if (!def) return false

    const typeName = def.type || def.typeName

    if (typeName === 'object' || typeName === 'ZodObject') {
      let shape: unknown
      if ('shape' in def && def.shape && typeof def.shape === 'object') {
        shape = def.shape
      } else if (
        unwrapped &&
        typeof unwrapped === 'object' &&
        'shape' in unwrapped
      ) {
        shape = unwrapped.shape
      }

      if (!shape || typeof shape !== 'object' || !(cleanPart in shape))
        return false

      // Cast shape to Record to index with cleanPart dynamically
      const indexedShape = shape as Record<string, unknown>
      currentSchema = indexedShape[cleanPart]

      const bracketCount = (part.match(/\[/g) || []).length
      for (let j = 0; j < bracketCount; j++) {
        const currentUnwrapped = unwrap(currentSchema)
        if (!currentUnwrapped) break
        const currentDef = getDef(currentUnwrapped)
        if (!currentDef) break
        const currentTypeName = currentDef.type || currentDef.typeName
        if (currentTypeName === 'array' || currentTypeName === 'ZodArray') {
          if ('element' in currentDef && currentDef.element) {
            currentSchema = currentDef.element
          } else if ('type' in currentDef && currentDef.type) {
            currentSchema = currentDef.type
          } else {
            break
          }
        } else {
          break
        }
      }
    } else {
      return false
    }
  }

  return isTypeRequired(currentSchema)
}

function isValidatorFunctionRequired(validator: unknown): boolean {
  if (typeof validator !== 'function') return false

  try {
    // Cast function to standard validator shape
    const valFn = validator as (args: { value: unknown }) => unknown
    const resString = valFn({ value: '' })
    if (
      resString &&
      (typeof resString === 'string' || typeof resString === 'object')
    ) {
      return true
    }
  } catch {}

  try {
    // Cast function to standard validator shape
    const valFn = validator as (args: { value: unknown }) => unknown
    const resUndef = valFn({ value: undefined })
    if (
      resUndef &&
      (typeof resUndef === 'string' || typeof resUndef === 'object')
    ) {
      return true
    }
  } catch {}

  try {
    // Cast function to standard validator shape
    const valFn = validator as (args: { value: unknown }) => unknown
    const resNull = valFn({ value: null })
    if (
      resNull &&
      (typeof resNull === 'string' || typeof resNull === 'object')
    ) {
      return true
    }
  } catch {}

  return false
}

export function isFieldRequired(field: unknown): boolean {
  if (!field || typeof field !== 'object') return false

  // 1. Check field-level validators
  if (
    'options' in field &&
    field.options &&
    typeof field.options === 'object'
  ) {
    // Cast options to extract validators dictionary
    const optionsObj = field.options as { validators?: Record<string, unknown> }
    const fieldValidators = optionsObj.validators
    if (fieldValidators && typeof fieldValidators === 'object') {
      for (const key of ['onChange', 'onBlur', 'onSubmit'] as const) {
        const validator = fieldValidators[key]
        if (validator) {
          if (typeof validator === 'object') {
            if (isTypeRequired(validator)) {
              return true
            }
          } else if (typeof validator === 'function') {
            if (isValidatorFunctionRequired(validator)) {
              return true
            }
          }
        }
      }
    }
  }

  // 2. Check form-level validators
  if ('form' in field && field.form && typeof field.form === 'object') {
    // Cast form to extract form options and validators
    const formObj = field.form as {
      options?: { validators?: Record<string, unknown> }
    }
    const formValidators = formObj.options?.validators
    if (formValidators && typeof formValidators === 'object') {
      for (const key of ['onChange', 'onBlur', 'onSubmit'] as const) {
        const schema = formValidators[key]
        if (schema && typeof schema === 'object') {
          if ('name' in field && typeof field.name === 'string') {
            if (isZodFieldRequired(schema, field.name)) {
              return true
            }
          }
        }
      }
    }
  }

  return false
}

export function fieldValidator(schema: z.ZodTypeAny) {
  return ({ value }: { value: unknown }) => {
    const r = schema.safeParse(value)
    return r.success ? undefined : r.error.issues[0]?.message
  }
}

export function getSchemaForPath(schema: unknown, path: string): any {
  if (!schema) return null
  const normalizedPath = path.replace(/\[\d+\]/g, '')
  const segments = normalizedPath.split('.').filter(Boolean)
  let current: unknown = schema

  for (const segment of segments) {
    current = unwrap(current)
    if (!current) return null

    const def = getDef(current)
    if (!def) return null

    const typeName = def.type || def.typeName
    if (typeName === 'object' || typeName === 'ZodObject') {
      let shape: unknown
      if ('shape' in def && def.shape && typeof def.shape === 'object') {
        shape = def.shape
      } else if (current && typeof current === 'object' && 'shape' in current) {
        shape = (current as { shape: unknown }).shape
      }

      if (!shape || typeof shape !== 'object' || !(segment in shape))
        return null

      const indexedShape = shape as Record<string, unknown>
      current = indexedShape[segment]
    } else {
      return null
    }
  }

  return current
}
