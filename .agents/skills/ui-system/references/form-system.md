# Form System

> **Rules:** [`../rules/ui.md`](../rules/ui.md) — form conventions, non-negotiables.

Built on `@tanstack/react-form` using `createFormHook` + `createFormHookContexts`.

## Setup (`src/components/app/form/form-context.tsx`)

Registers all field components and form components into `useAppForm`:

| Field Components | Type Value | Description |
|---|---|---|
| `TextField` | `string` | Text input |
| `EmailField` | `string` | Email input |
| `PasswordField` | `string` | Password input |
| `TextareaField` | `string` | Multi-line text |
| `NumberField` | `number` | Numeric with Indonesian formatting |
| `PhoneField` | `string` | Tel input with +62 prefix and formatting |
| `SelectField` | `string` | Native select |
| `ComboboxField` | `string` / `string[]` | Searchable popover (single/multi) |
| `AddressField` | `AddressValue` | Area search + street address |
| `AreaSearchField` | `string` | Biteship area search |
| `PhotoUploadField` | `string` / `string[]` | Photo upload with preview |
| `FileUploadField` | `string[]` | File upload list |

| Form Components | Description |
|---|---|
| `SubmitButton` | Auto-disables during submission |
| `FormError` | Alert with AlertCircle icon |

## Basic Usage

```tsx
import { useAppForm, FormRoot, FormSection, FormGrid, FormActions } from '#/components/app/form'

const form = useAppForm({
  defaultValues: { name: '', email: '' },
  onSubmit: async ({ value }) => { /* server fn call */ },
})

return (
  <FormRoot form={form}>
    <FormSection title="Details">
      <FormGrid columns={2}>
        <form.AppField name="name">
          {(field) => <field.TextField label="Name" />}
        </form.AppField>
        <form.AppField name="email">
          {(field) => <field.EmailField label="Email" />}
        </form.AppField>
      </FormGrid>
    </FormSection>
    <FormActions>
      <form.AppForm>
        <form.SubmitButton>Save</form.SubmitButton>
      </form.AppForm>
    </FormActions>
  </FormRoot>
)
```

## Layout Components (`form-layout.tsx`)

| Component | Props | Description |
|---|---|---|
| `FormRoot` | form, onAnyValueChange?, className? | Form wrapper with context |
| `FormSection` | title, description?, titleHidden? | Section with legend |
| `FormGrid` | columns?: 1\|2\|3 | Responsive grid for fields |
| `FormActions` | align?: 'end'\|'stretch' | Button row layout |

## Array Fields (Dynamic Lists)

```tsx
<form.AppField name="items" mode="array">
  {(itemsField) => (
    <div>
      {itemsField.state.value.map((_, i) => (
        <div key={i}>
          <form.AppField name={`items[${i}].name`}>
            {(field) => <field.TextField label="Name" />}
          </form.AppField>
          <button onClick={() => itemsField.removeValue(i)}>Remove</button>
        </div>
      ))}
      <button onClick={() => itemsField.pushValue({ name: '', quantity: '1' })}>
        Add Item
      </button>
    </div>
  )}
</form.AppField>
```

## withForm Pattern (Reusable Field Groups)

```typescript
export const CustomerFormFields = withForm({
  defaultValues: { name: '', email: '' },
  render: ({ form }) => (
    <form.AppField name="name">
      {(field) => <field.TextField label="Customer Name" />}
    </form.AppField>
  ),
})
```

## Utilities (`form-utils.ts`)

| Function | Description |
|---|---|
| `firstError(errors)` | Extract first readable error from field meta |
| `formatNumber(value)` | Indonesian number formatting |
| `formatPhone(value)` | Phone formatting 0000-0000-0000 |
| `stripNonDigits(value)` | Remove non-digit characters |
| `stripNumberFormatting(value)` | Strip number formatting |
