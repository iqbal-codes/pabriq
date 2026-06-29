import { MessageCircle } from 'lucide-react'
import { useTranslations } from 'use-intl'
import { Button } from '#/components/ui/button'
import type { PortalOrder } from '../model'

type PortalContactButtonProps = {
  order: Pick<PortalOrder, 'id' | 'orderNumber' | 'orgPhone'>
  label: 'chatOnWhatsApp' | 'contactAdmin'
  className?: string
}

export function PortalContactButton({
  order,
  label,
  className,
}: PortalContactButtonProps) {
  const t = useTranslations('portal')

  const waPhone = order.orgPhone?.replace(/\D/g, '').replace(/^0/, '62')
  if (!waPhone) return null

  const waUrl = `https://wa.me/${waPhone}?text=${encodeURIComponent(
    t('whatsappOrderMessage', { order: order.orderNumber ?? order.id }),
  )}`

  return (
    <Button asChild variant="outline" className={className}>
      <a href={waUrl} target="_blank" rel="noopener noreferrer">
        <MessageCircle className="mr-2 size-4" />
        {label === 'chatOnWhatsApp' ? t('chatOnWhatsApp') : t('contactAdmin')}
      </a>
    </Button>
  )
}
