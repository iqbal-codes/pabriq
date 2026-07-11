import * as React from 'react'

/**
 * Observes the width of a DOM element and reports the current pixel value.
 * Returns `null` until the first measurement is available.
 *
 * Uses `ResizeObserver` when available and falls back to an `animation-frame`
 * loop reading `contentRect.width` so SSR/render-time layout values are still
 * picked up in environments without `ResizeObserver`.
 */
export function useColumnWidth<T extends HTMLElement>(
  ref: React.RefObject<T | null>,
): number | null {
  const [width, setWidth] = React.useState<number | null>(null)

  React.useEffect(() => {
    const node = ref.current
    if (!node) return

    const update = () => {
      const rect = node.getBoundingClientRect()
      setWidth(rect.width)
    }

    update()

    if (typeof ResizeObserver === 'undefined') {
      const onResize = () => update()
      window.addEventListener('resize', onResize)
      return () => {
        window.removeEventListener('resize', onResize)
      }
    }

    const observer = new ResizeObserver(() => update())
    observer.observe(node)
    return () => {
      observer.disconnect()
    }
  }, [ref])

  return width
}
