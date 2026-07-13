import { createFormHook } from '@tanstack/react-form'
import { useInsertionEffect, useMemo, useRef } from 'react'
import { fieldContext, formContext } from './form-context-base'
import { FormError } from './form-error'
import {
  AddressField,
  AreaSearchField,
  CheckboxGroupField,
  ComboboxField,
  DateField,
  EmailField,
  FileUploadField,
  NumberField,
  PasswordField,
  PhoneField,
  PhotoUploadField,
  PortalFileUploadField,
  RadioCardField,
  RadioGroupField,
  SelectField,
  TextareaField,
  TextField,
} from './form-fields'
import { SubmitButton } from './form-submit'
import { getSchemaForPath } from './form-utils'

const { useAppForm: useAppFormBase, withForm } = createFormHook({
  fieldComponents: {
    AddressField,
    CheckboxGroupField,
    ComboboxField,
    DateField,
    TextField,
    EmailField,
    PasswordField,
    TextareaField,
    SelectField,
    NumberField,
    PhoneField,
    AreaSearchField,
    PhotoUploadField,
    FileUploadField,
    PortalFileUploadField,
    RadioCardField,
    RadioGroupField,
  },
  formComponents: {
    SubmitButton,
    FormError,
  },
  fieldContext,
  formContext,
})

export { withForm }

export const useAppForm: typeof useAppFormBase = (options) => {
  const schema = (options as { validators?: { onChange?: unknown } })
    ?.validators?.onChange

  const formOptions = { ...options }
  if (schema && formOptions.validators) {
    formOptions.validators = { ...formOptions.validators }
    const validatorsObj = formOptions.validators as { onChange?: unknown }
    delete validatorsObj.onChange
  }

  const form = useAppFormBase(formOptions)

  const AppFieldBase = form.AppField

  // Cast form to overwrite read-only AppField property on the library type
  const formMutable = form as unknown as { AppField: unknown }

  const appFieldBaseRef = useRef(AppFieldBase)
  const schemaRef = useRef(schema)
  useInsertionEffect(() => {
    appFieldBaseRef.current = AppFieldBase
    schemaRef.current = schema
  })

  formMutable.AppField = useMemo(() => {
    return function AppFieldWrapper(
      props: Parameters<typeof appFieldBaseRef.current>[0],
    ) {
      const currentSchema = schemaRef.current
      const FieldBase = appFieldBaseRef.current
      let fieldValidatorFn:
        | ((params: { value: unknown }) => string | undefined)
        | undefined
      if (currentSchema && props.name) {
        const fieldSchema = getSchemaForPath(currentSchema, props.name) as {
          safeParse?: (value: unknown) => {
            success: boolean
            error?: { issues: { message: string }[] }
          }
        } | null
        if (fieldSchema && typeof fieldSchema.safeParse === 'function') {
          const safeParseFn = fieldSchema.safeParse
          fieldValidatorFn = ({ value }) => {
            const r = safeParseFn(value)
            return r.success ? undefined : r.error?.issues[0]?.message
          }
        }
      }

      const mergedValidators = { ...props.validators }
      const fValFn = fieldValidatorFn
      if (fValFn) {
        const originalOnChange = props.validators?.onChange as
          | ((args: { value: unknown }) => unknown)
          | undefined
        mergedValidators.onChange = (params: { value: unknown }) => {
          const fieldError = fValFn(params)
          if (fieldError) return fieldError
          if (originalOnChange) {
            return originalOnChange(params)
          }
        }
      }

      return <FieldBase {...props} validators={mergedValidators} />
    }
  }, [])

  return form
}
