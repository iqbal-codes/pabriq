import type { ReactNode } from 'react'
import { cn } from '#/lib/utils'

type PageContentProps = {
  children: ReactNode
  className?: string
}

export function PageContent({ children, className }: PageContentProps) {
  return (
    <main
      className={cn(
        'max-w-6xl px-4 md:px-6 py-6 space-y-6 mx-auto overflow-x-auto w-full',
        className,
      )}
    >
      {children}
    </main>
  )
}
