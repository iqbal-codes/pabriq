import { createFileRoute } from '@tanstack/react-router'
import { getRequestHeaders } from '@tanstack/react-start/server'
import {
  generateQuotationPdf,
  resolveOrgForDocument,
} from '#/features/documents/server.tsx'
import { SECURITY_RESPONSE_HEADERS } from '#/lib/security-headers'

export const Route = createFileRoute('/api/documents/orders/$id/quotation')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const headers = getRequestHeaders()
        let orgId: string
        try {
          const authResult = await resolveOrgForDocument(headers)
          orgId = authResult.orgId
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Unauthorized'
          if (message === 'Unauthorized') {
            return new Response('Unauthorized', { status: 401 })
          }
          if (message === 'No organization') {
            return new Response('Forbidden', { status: 403 })
          }
          return new Response('Internal Server Error', { status: 500 })
        }

        let pdfBuffer: Buffer
        try {
          pdfBuffer = await generateQuotationPdf(orgId, params.id)
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Unknown error'
          if (message === 'Order not found') {
            return new Response('Not found', { status: 404 })
          }
          return new Response('Internal Server Error', { status: 500 })
        }

        return new Response(new Uint8Array(pdfBuffer), {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'inline',
            ...SECURITY_RESPONSE_HEADERS,
          },
        })
      },
    },
  },
})
