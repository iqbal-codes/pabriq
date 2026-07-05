import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Dialog, DialogContent, DialogDescription, DialogTitle } from './dialog'

function renderOpenDialog(options?: {
  onOpenChange?: (open: boolean) => void
  showCloseButton?: boolean
}) {
  return render(
    <Dialog open onOpenChange={options?.onOpenChange}>
      <DialogContent showCloseButton={options?.showCloseButton}>
        <DialogTitle>Dialog title</DialogTitle>
        <DialogDescription>Dialog description</DialogDescription>
        <p>Dialog body</p>
      </DialogContent>
    </Dialog>,
  )
}

describe('DialogContent', () => {
  it('renders a button-styled close control and closes the dialog', async () => {
    const onOpenChange = vi.fn()
    const user = userEvent.setup()

    renderOpenDialog({ onOpenChange })

    const closeButton = screen.getByRole('button', { name: 'Close' })
    expect(closeButton).toHaveAttribute('data-variant', 'ghost')
    expect(closeButton).toHaveAttribute('data-size', 'icon-sm')
    expect(closeButton).toHaveAttribute('data-slot', 'dialog-close')

    await user.click(closeButton)

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('omits the close control when showCloseButton is false', () => {
    renderOpenDialog({ showCloseButton: false })

    expect(screen.queryByRole('button', { name: 'Close' })).not.toBeInTheDocument()
  })
})
