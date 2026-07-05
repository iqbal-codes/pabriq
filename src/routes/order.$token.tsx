import { createFileRoute, useParams } from '@tanstack/react-router'
import { useEffect } from 'react'
import { PortalPage } from '#/features/portal/pages/portal-page'

export const Route = createFileRoute('/order/$token')({
  beforeLoad: () => ({ pageTitle: 'completeOrderData' as const }),
  component: PortalRoute,
})

function PortalRoute() {
  const { token } = useParams({ from: Route.id })

  useEffect(() => {
    const existingScript = document.querySelector(
      'script[src*="midtrans.com/snap/snap.js"]',
    )
    if (existingScript) return

    const script = document.createElement('script')
    const isProd = import.meta.env.VITE_MIDTRANS_IS_PRODUCTION === 'true'
    script.src = isProd
      ? 'https://app.midtrans.com/snap/snap.js'
      : 'https://app.sandbox.midtrans.com/snap/snap.js'
    script.setAttribute(
      'data-client-key',
      import.meta.env.VITE_MIDTRANS_CLIENT_KEY ?? '',
    )
    script.async = true
    document.head.appendChild(script)

    return () => {
      script.remove()
    }
  }, [])

  return <PortalPage token={token} />
}
