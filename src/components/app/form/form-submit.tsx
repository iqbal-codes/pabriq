import { useStore } from '@tanstack/react-form'
import type { ComponentProps } from 'react'
import { Button } from '#/components/ui/button'
import { useFormContext } from './form-context'

type SubmitButtonProps = ComponentProps<typeof Button> & {
  children: string
}

export function SubmitButton({ children, ...props }: SubmitButtonProps) {
  const form = useFormContext()
  const isSubmitting = useStore(form.store, (state) => state.isSubmitting)
  const canSubmit = useStore(form.store, (state) => state.canSubmit)

  return (
    <Button
      type="submit"
      disabled={!canSubmit || isSubmitting}
      isLoading={isSubmitting}
      {...props}
    >
      {children}
    </Button>
  )
}
