import { createFormHook, createFormHookContexts } from '@tanstack/react-form'
import { FormError } from './form-error'
import {
  AddressField,
  AreaSearchField,
  EmailField,
  NumberField,
  PasswordField,
  PhoneField,
  PhotoUploadField,
  SelectField,
  TextareaField,
  TextField,
} from './form-fields'
import { SubmitButton } from './form-submit'

export const { fieldContext, formContext, useFieldContext, useFormContext } =
  createFormHookContexts()

export const { useAppForm, withForm } = createFormHook({
  fieldComponents: {
    AddressField,
    TextField,
    EmailField,
    PasswordField,
    TextareaField,
    SelectField,
    NumberField,
    PhoneField,
    AreaSearchField,
    PhotoUploadField,
  },
  formComponents: {
    SubmitButton,
    FormError,
  },
  fieldContext,
  formContext,
})
