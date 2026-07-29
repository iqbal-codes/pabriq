import { createFileRoute } from '@tanstack/react-router'
import { and, eq } from 'drizzle-orm'
import { db } from '#/db/index'
import { invoices as invoicesTable, orders as ordersTable } from '#/db/schema'
import { generateInvoicePdf } from '#/features/documents/server.tsx'
import { SECURITY_RESPONSE_HEADERS } from '#/lib/security-headers'

export const Route = createFileRoute(
  '/api/documents/invoices/portal/$invoiceId/$token',
)({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const rows = await db
          .select({ orgId: ordersTable.orgId })
          .from(invoicesTable)
          .innerJoin(ordersTable, eq(invoicesTable.orderId, ordersTable.id))
          .where(
            and(
              eq(invoicesTable.id, params.invoiceId),
              eq(ordersTable.orderToken, params.token),
            ),
          )
          .limit(1)

        if (rows.length === 0) {
          return new Response('Not found', { status: 404 })
        }

        let pdfBuffer: Buffer
        try {
          pdfBuffer = await generateInvoicePdf(
            rows[0].orgId,
            params.invoiceId,
            params.token,
          )
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Unknown error'
          if (message === 'Invoice not found') {
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
