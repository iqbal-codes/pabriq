# Forms Reference

Scope: building or modifying forms that use `useAppForm`, `FormRoot`, `FormSheet`, field components, and Zod validation. This reference applies whenever a form is created or a form field is added/changed.

## Prerequisites

- Zod schema in `src/lib/validation-schemas.ts` (or co-located if domain-specific).
- `use-intl` translations available for field labels and error messages.
- Feature hooks (e.g. `useCreateCustomer`, `useUpdateCustomer`) for the submit handler.

## Ordered recipe

### 1. Define the Zod schema

Every form field must have a corresponding Zod key. Validation runs at field level via `getSchemaForPath` introspection — the schema path must match the `name` prop on `form.AppField`. Nested objects use dot notation (`address.areaId`). Source: `src/components/app/form/form-utils.ts:373-409`.

### 2. Create the form sheet (or inline form)

Use `FormSheet` for slide-in forms. Use `FormRoot` + `FormSection` for inline forms. Follow the canonical pattern in `src/features/customers/components/customer-form-sheet.tsx`.

Key invariants:
- `FormSheet`: right-side sheet, `w-full! sm:max-w-xl!`, full-height. Source: `src/components/app/form/form-sheet.tsx`.
- `FormRoot`: wraps `<form>` with `preventDefault` + TanStack `handleSubmit`. Source: `src/components/app/form/form-layout.tsx:18-42`.

### 3. Define fields with `withForm` or inline `form.AppField`

Two patterns, both observed. Canonical reference: `src/features/customers/components/customer-form-fields.tsx`.

- **`withForm` extract** — preferred when fields are reused or numerous. Uses `FormSection`, `FormGrid`, `Card` grouping.
- **Inline `form.AppField`** — used when fields are simple or few.

**(Observed)** 16 registered field components available on the `field` render prop: `TextField`, `TextareaField`, `EmailField`, `PasswordField`, `NumberField`, `PhoneField`, `SelectField`, `DateField`, `ComboboxField`, `RadioGroupField`, `RadioCardField`, `CheckboxGroupField`, `AddressField`, `AreaSearchField`, `FileUploadField`, `PhotoUploadField`, `PortalFileUploadField`. Source: `src/components/app/form/form-context.tsx:27-53`.

### 4. Layout composition

- `FormSection`: titled group with optional description and action slot. Source: `src/components/app/form/form-layout.tsx:52-77`.
- `FormGrid`: responsive grid, `columns` prop (1–3). Source: `src/components/app/form/form-layout.tsx:83-99`.
- `FormActions`: submit/cancel row, `align` prop (`end` | `stretch` | `stacked`). Source: `src/components/app/form/form-layout.tsx:107-126`.

### 5. Submit and error handling

- `form.SubmitButton` reads `isSubmitting` and `canSubmit` from the form store. Accepts `isPending` prop for external loading. Source: `src/components/app/form/form-submit.tsx`.
- `FormError` renders `Alert variant="destructive"` + `AlertCircle`. Only shown when `message` is truthy. Source: `src/components/app/form/form-error.tsx`.
- `toast.success()` / `toast.error()` from Sonner for transient feedback. Source: `src/components/ui/sonner.tsx`.

## Invariants

**(Required)**
- Every `form.AppField` name must match a Zod schema key exactly — path mismatch = silent validation failure.
- `FormRoot` must wrap all `form.AppField` elements (provides `formContext`).
- `SubmitButton` must be inside `FormRoot` (reads `useFormContext`).
- All user-facing labels and error messages must go through `useTranslations`.

**(Observed)**
- `TextInputFieldShell` render-prop provides `id`, `name`, `value`, `onChange`, `onBlur`, `FormLabel`, error display, and `data-invalid`. Source: `src/components/app/form/text-input-field-shell.tsx`.
- `FormLabel` auto-detects required/optional from Zod schema via `isFieldRequired(field)`. Override with `optional` prop. Source: `src/components/app/form/form-label.tsx`.
- `NumberField` formats with `Intl.NumberFormat('id-ID')`. `PhoneField` hardcodes `+62` prefix. Source: `src/components/app/form/number-field.tsx`, `src/components/app/form/phone-field.tsx`.

## Variations

**(Observed)**
- **Create vs Edit**: same form sheet, different `defaultValues`. Edit mode pre-fills from query hook (e.g. `useCustomer(id)`). Show loading skeleton while fetching. Canonical: `CustomerFormSheet` with `mode: { type: 'create' } | { type: 'edit'; id: string }`.
- **Conditional fields**: use `useStore(form.store, ...)` to read sibling values and conditionally render/modify fields. Canonical: `CustomerFormFields` — `isWni` switch controls `AddressField.showAreaSearch`.
- **Multi-section forms**: stack `FormSection` inside `Card` with `CardHeader`/`CardContent` for visual grouping. Canonical: `CustomerFormFields`.
- **Dialog forms** (centered): use `Dialog` from `#/components/ui/dialog` instead of `FormSheet` when the form is a focused action (e.g. approve/reject). Canonical: `src/features/production/components/review-modal.tsx`.

## Failure states

**(Observed)**
- Zod `onChange` validator is injected via `useMemo` wrapper that deletes and re-injects the validator on the `AppField`. This is a TanStack Form integration workaround. Source: `src/components/app/form/form-context.tsx:57-113`.
- Draft-view schema is recreated inside `useMemo` with prop dependencies — functional but not memoized across renders. Source: `src/features/portal/pages/draft-view.tsx:43-66`.

## Canonical pointers

| What | Path |
|------|------|
| Form hook + field registry | `src/components/app/form/form-context.tsx` |
| Layout primitives | `src/components/app/form/form-layout.tsx` |
| Form sheet | `src/components/app/form/form-sheet.tsx` |
| Submit button | `src/components/app/form/form-submit.tsx` |
| Label + required detection | `src/components/app/form/form-label.tsx` |
| Error display | `src/components/app/form/form-error.tsx` |
| Validation utilities | `src/components/app/form/form-utils.ts` |
| Shared field types | `src/components/app/form/form-fields-shared.tsx` |
| Barrel exports | `src/components/app/form/index.ts` |
| Customer form sheet (canonical) | `src/features/customers/components/customer-form-sheet.tsx` |
| Customer form fields (canonical) | `src/features/customers/components/customer-form-fields.tsx` |
| Validation schema | `src/lib/validation-schemas.ts` |

## Verification

```bash
bun run test -- src/components/app/form/form.test.tsx
```

Covers: field rendering, format functions, submit flow, label required/optional detection, error display.

## Completion criterion

Form renders with all fields wired to Zod validation, layout uses `FormSection`/`FormGrid`/`FormActions`, submit shows pending state, errors display inline, all labels are translated, and `bun run test -- src/components/app/form/form.test.tsx` passes.
