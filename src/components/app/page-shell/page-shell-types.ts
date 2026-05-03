import type { LucideIcon } from 'lucide-react'

export type PageAction = {
  label: string
  icon?: LucideIcon
  href?: string
  onClick?: () => void
  isLoading?: boolean
}
