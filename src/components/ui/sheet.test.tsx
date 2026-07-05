import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Sheet, SheetContent, SheetDescription, SheetTitle } from './sheet'

function renderOpenSheet(options?: {
  onOpenChange?: (open: boolean) => void
  showCloseButton?: boolean
}) {
  return render(
    <Sheet open onOpenChange={options?.onOpenChange}>
      <SheetContent showCloseButton={options?.showCloseButton}>
        <SheetTitle>Sheet title</SheetTitle>
        <SheetDescription>Sheet description</SheetDescription>
        <p>Sheet body</p>
      </SheetContent>
    </Sheet>,
  )
}

describe('SheetContent', () => {
  it('renders a button-styled close control and closes the sheet', async () => {
    const onOpenChange = vi.fn()
    const user = userEvent.setup()

    renderOpenSheet({ onOpenChange })

    const closeButton = screen.getByRole('button', { name: 'Close' })
    expect(closeButton).toHaveAttribute('data-variant', 'ghost')
    expect(closeButton).toHaveAttribute('data-size', 'icon-sm')
    expect(closeButton).toHaveAttribute('data-slot', 'sheet-close')

    await user.click(closeButton)

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('omits the close control when showCloseButton is false', () => {
    renderOpenSheet({ showCloseButton: false })

    expect(screen.queryByRole('button', { name: 'Close' })).not.toBeInTheDocument()
  })
})
