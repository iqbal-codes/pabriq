import * as React from 'react'

export function useIsMobile(breakpoint = 768, initialValue = false): boolean {
  const [isMobile, setIsMobile] = React.useState(initialValue)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < breakpoint)
    }
    mql.addEventListener('change', onChange)
    setIsMobile(window.innerWidth < breakpoint)
    return () => mql.removeEventListener('change', onChange)
  }, [breakpoint])

  return isMobile
}
