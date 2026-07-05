import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from './drawer'

if (!HTMLElement.prototype.setPointerCapture) {
  Object.defineProperty(HTMLElement.prototype, 'setPointerCapture', {
    configurable: true,
    value: () => {},
  })
}

if (!HTMLElement.prototype.releasePointerCapture) {
  Object.defineProperty(HTMLElement.prototype, 'releasePointerCapture', {
    configurable: true,
    value: () => {},
  })
}

function renderOpenDrawer(options?: {
  onOpenChange?: (open: boolean) => void
  showCloseButton?: boolean
}) {
  return render(
    <Drawer open onOpenChange={options?.onOpenChange}>
      <DrawerContent
        showCloseButton={options?.showCloseButton}
        style={{ transform: 'translate3d(0, 0, 0)' }}
      >
        <DrawerTitle>Drawer title</DrawerTitle>
        <DrawerDescription>Drawer description</DrawerDescription>
        <p>Drawer body</p>
      </DrawerContent>
    </Drawer>,
  )
}

describe('DrawerContent', () => {
  it('renders a button-styled close control and closes the drawer', async () => {
    const onOpenChange = vi.fn()
    const user = userEvent.setup()

    renderOpenDrawer({ onOpenChange })

    const closeButton = screen.getByRole('button', { name: 'Close' })
    expect(closeButton).toHaveAttribute('data-variant', 'ghost')
    expect(closeButton).toHaveAttribute('data-size', 'icon-sm')
    expect(closeButton).toHaveAttribute('data-slot', 'drawer-close')

    await user.click(closeButton)

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('omits the close control when showCloseButton is false', () => {
    renderOpenDrawer({ showCloseButton: false })

    expect(screen.queryByRole('button', { name: 'Close' })).not.toBeInTheDocument()
  })
})
