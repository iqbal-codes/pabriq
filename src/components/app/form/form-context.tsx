import { createFormHook, createFormHookContexts } from '@tanstack/react-form'
import { FormError } from './form-error'
import {
  AddressField,
  AreaSearchField,
  ComboboxField,
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

export const { fieldContext, formContext, useFieldContext, useFormContext } =
  createFormHookContexts()

export const { useAppForm, withForm } = createFormHook({
  fieldComponents: {
    AddressField,
    ComboboxField,
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
