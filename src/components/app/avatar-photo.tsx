import { User } from 'lucide-react'
import type { ReactElement } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '#/components/ui/avatar'
import { useAssetSignedUrl } from '#/features/assets/hooks'
import { cn } from '#/lib/utils'

type AvatarPhotoProps = {
  assetId: string | null
  name: string
  className?: string
}

function getInitials(name: string): string {
  const initials = name
    .split(' ')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return initials || '?'
}

export function AvatarPhoto({
  assetId,
  name,
  className,
}: AvatarPhotoProps): ReactElement {
  const signedUrlQuery = useAssetSignedUrl(assetId, 'preview')
  const imageUrl = signedUrlQuery.data?.url
  const initials = getInitials(name)

  return (
    <Avatar className={cn('size-10 rounded-full', className)}>
      {imageUrl ? (
        <AvatarImage src={imageUrl} alt={name} className="object-cover" />
      ) : null}
      <AvatarFallback>
        {initials === '?' ? <User className="size-4" /> : initials}
      </AvatarFallback>
    </Avatar>
  )
}
