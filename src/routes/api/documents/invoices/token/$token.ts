import { createFileRoute } from '@tanstack/react-router'
import { eq } from 'drizzle-orm'
import { db } from '#/db/index'
import { invoices as invoicesTable, orders as ordersTable } from '#/db/schema'
import { generateInvoicePdf } from '#/features/documents/server.tsx'

export const Route = createFileRoute('/api/documents/invoices/token/$token')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const orderRows = await db
          .select({ id: ordersTable.id, orgId: ordersTable.orgId })
          .from(ordersTable)
          .where(eq(ordersTable.orderToken, params.token))
          .limit(1)

        if (orderRows.length === 0) {
          return new Response('Not found', { status: 404 })
        }

        const invoiceRows = await db
          .select({ id: invoicesTable.id })
          .from(invoicesTable)
          .where(eq(invoicesTable.orderId, orderRows[0].id))
          .limit(1)

        if (invoiceRows.length === 0) {
          return new Response('Not found', { status: 404 })
        }

        let pdfBuffer: Buffer
        try {
          pdfBuffer = await generateInvoicePdf(
            orderRows[0].orgId,
            invoiceRows[0].id,
            params.token,
          )
        } catch {
          return new Response('Internal Server Error', { status: 500 })
        }

        return new Response(new Uint8Array(pdfBuffer), {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'inline',
          },
        })
      },
    },
  },
})
