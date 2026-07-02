import { createFormHook } from '@tanstack/react-form'
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

export const { useAppForm, withForm } = createFormHook({
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
