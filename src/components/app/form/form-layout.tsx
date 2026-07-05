import { createContext, useRef } from 'react'
import { FieldGroup, FieldLegend, FieldSet } from '#/components/ui/field'
import { cn } from '#/lib/utils'

type FormRootContextValue = {
  onAnyValueChange?: () => void
}

const FormRootContext = createContext<FormRootContextValue | null>(null)

type FormRootProps = {
  form: { handleSubmit: () => void }
  onAnyValueChange?: () => void
  className?: string
  children: React.ReactNode
}

export function FormRoot({
  form,
  onAnyValueChange,
  className,
  children,
}: FormRootProps) {
  const ctx = useRef<FormRootContextValue>({ onAnyValueChange }).current
  ctx.onAnyValueChange = onAnyValueChange

  return (
    <FormRootContext.Provider value={ctx}>
      <form
        className={cn('space-y-6', className)}
        onSubmit={(e) => {
          // react-doctor: intentional — TanStack Form handleSubmit needs preventDefault
          e.preventDefault()
          e.stopPropagation()
          form.handleSubmit()
        }}
      >
        {children}
      </form>
    </FormRootContext.Provider>
  )
}

type FormSectionProps = {
  title: string
  description?: string
  titleHidden?: boolean
  children: React.ReactNode
  action?: React.ReactNode
}

export function FormSection({
  title,
  description,
  titleHidden,
  children,
  action,
}: FormSectionProps) {
  return (
    <FieldSet>
      {!titleHidden && (
        <div className="flex justify-between items-center">
          <FieldLegend>
            {title}
            {description && (
              <p className="text-sm font-normal text-muted-foreground">
                {description}
              </p>
            )}
          </FieldLegend>
          {action}
        </div>
      )}
      {children}
    </FieldSet>
  )
}

type FormGridProps = {
  columns?: 1 | 2 | 3
  className?: string
  children: React.ReactNode
}

export function FormGrid({ columns = 2, className, children }: FormGridProps) {
  return (
    <FieldGroup
      className={cn(
        'grid gap-4',
        columns === 1 && 'grid-cols-1',
        columns === 2 && 'grid-cols-1 md:grid-cols-2',
        columns === 3 && 'grid-cols-1 md:grid-cols-3',
        className,
      )}
    >
      {children}
    </FieldGroup>
  )
}

type FormActionsProps = {
  align?: 'end' | 'stretch' | 'stacked'
  className?: string
  children: React.ReactNode
}

export function FormActions({
  align = 'end',
  className,
  children,
}: FormActionsProps) {
  return (
    <div
      className={cn(
        'flex gap-3',
        align === 'end' && 'flex-col md:flex-row md:justify-end',
        align === 'stretch' && 'flex-col',
        align === 'stacked' &&
          'flex-col [&_button]:w-full md:flex-row md:justify-end md:[&_button]:w-auto',
        className,
      )}
    >
      {children}
    </div>
  )
}
