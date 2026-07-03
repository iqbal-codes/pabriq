import { useStore } from '@tanstack/react-form'
import type { ComponentProps, ReactNode } from 'react'
import { Button } from '#/components/ui/button'
import { useFormContext } from './form-context-base'

type SubmitButtonProps = ComponentProps<typeof Button> & {
  children: ReactNode
  isPending?: boolean
}

export function SubmitButton({
  children,
  isPending = false,
  disabled,
  isLoading,
  ...props
}: SubmitButtonProps) {
  const form = useFormContext()
  const isSubmitting = useStore(form.store, (state) => state.isSubmitting)
  const canSubmit = useStore(form.store, (state) => state.canSubmit)

  const isBusy = isSubmitting || isPending || Boolean(isLoading)

  return (
    <Button
      type="submit"
      disabled={disabled || !canSubmit || isBusy}
      isLoading={isBusy}
      {...props}
    >
      {children}
    </Button>
  )
}
