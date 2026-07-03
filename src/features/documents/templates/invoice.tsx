import { Document, Image, Page, Text, View } from '@react-pdf/renderer'
import {
  formatPdfCurrency,
  formatPdfDateTime,
  formatPdfPercent,
} from '../pdf-format'
import { PDF_LOCALE } from '../pdf-locale'
import type { InvoicePdfData } from '../types'
import {
  createPdfStyles,
  PdfAddressBlock,
  PdfMetaRow,
  PdfPricingLine,
  registerPdfFonts,
} from './pdf-template-shared'

registerPdfFonts()

const styles = createPdfStyles('invoice')

interface InvoiceDocumentProps {
  data: InvoicePdfData
}

export function InvoiceDocument({ data }: InvoiceDocumentProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.topRow}>
          <View style={styles.logoWrap}>
            {data.org.logoUrl && (
              <Image src={data.org.logoUrl} style={styles.logo} />
            )}
          </View>
          <View style={styles.metaWrap}>
            <Text style={styles.title}>{PDF_LOCALE.invoice}</Text>
            <PdfMetaRow
              styles={styles}
              label={PDF_LOCALE.invoiceNo}
              value={data.invoiceNumber}
            />
            <PdfMetaRow
              styles={styles}
              label={PDF_LOCALE.invoiceDate}
              value={formatPdfDateTime(data.createdAt)}
            />
            {/* <PdfMetaRow
              styles={styles}
              label={PDF_LOCALE.due}
              value={formatPdfDate(data.dueDate)}
            /> */}
          </View>
        </View>

        <View style={styles.addressRow}>
          <PdfAddressBlock
            styles={styles}
            title={PDF_LOCALE.billFrom}
            name={data.org.name}
            addressLines={[
              data.org.email ?? '',
              data.org.phone ? `+62${data.org.phone}` : '',
              data.org.address ?? '',
            ].filter(Boolean)}
          />
          <PdfAddressBlock
            styles={styles}
            title={PDF_LOCALE.billTo}
            name={data.customer.name}
            align="right"
            addressLines={[
              data.customer.email ?? '',
              data.customer.phone ? `+62${data.customer.phone}` : '',
              data.customer.address ?? '',
              data.shippingAddress
                ? [
                    data.shippingAddress.streetAddress,
                    data.shippingAddress.areaName,
                  ]
                    .filter(Boolean)
                    .join(', ')
                : '',
            ].filter(Boolean)}
          />
        </View>

        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderCell, styles.colDesc]}>
            {PDF_LOCALE.description}
          </Text>
          <Text style={[styles.tableHeaderCell, styles.colRate]}>
            {PDF_LOCALE.rate}
          </Text>
          <Text style={[styles.tableHeaderCell, styles.colQty]}>
            {PDF_LOCALE.qty}
          </Text>

          <Text style={[styles.tableHeaderCell, styles.colTax]}>
            {PDF_LOCALE.tax}
          </Text>
          <Text style={[styles.tableHeaderCell, styles.colAmt]}>
            {PDF_LOCALE.amount}
          </Text>
        </View>

        {data.lineItems.map((item) => (
          <View
            key={`${item.description}-${item.quantity}-${item.unitPrice}`}
            style={styles.tableRow}
          >
            <Text style={[styles.tableCell, styles.colDesc]}>
              {item.lineType && PDF_LOCALE.lineTypes[item.lineType]}
              {item.description}
            </Text>
            <Text style={[styles.tableCellRight, styles.colRate]}>
              {formatPdfCurrency(item.unitPrice)}
            </Text>
            <Text style={[styles.tableCellRight, styles.colQty]}>
              {item.quantity}
            </Text>
            <Text style={[styles.tableCellRight, styles.colTax]}>
              {formatPdfPercent(item.taxPercent)}
            </Text>
            <Text style={[styles.tableCellRight, styles.colAmt]}>
              {formatPdfCurrency(item.total)}
            </Text>
          </View>
        ))}

        <View style={styles.footerRow}>
          <View style={styles.notesSection}>
            {(data.notes || data.paymentMethod) && (
              <View>
                <Text style={styles.notesTitle}>
                  {PDF_LOCALE.paymentInstructions}
                </Text>
                {data.paymentMethod && (
                  <Text style={styles.notesText}>
                    {data.paymentMethod.bankName ||
                    data.paymentMethod.accountNumber
                      ? `\n${PDF_LOCALE.bank} : ${data.paymentMethod.bankName ?? ''}`
                      : ''}
                    {data.paymentMethod.accountNumber
                      ? `\n${PDF_LOCALE.accountNo} : ${data.paymentMethod.accountNumber}`
                      : ''}
                  </Text>
                )}
                {data.notes && (
                  <Text style={styles.notesText}>{data.notes}</Text>
                )}
              </View>
            )}
          </View>
          <View style={styles.pricingSection}>
            <PdfPricingLine
              styles={styles}
              label={PDF_LOCALE.subtotal}
              value={formatPdfCurrency(data.subtotal)}
            />
            {data.isFinal && data.alreadyPaid > 0 && (
              <PdfPricingLine
                styles={styles}
                label={PDF_LOCALE.alreadyPaidDP}
                value={formatPdfCurrency(data.alreadyPaid)}
                muted
              />
            )}
            {data.percentage !== null && data.percentage < 100 && (
              <PdfPricingLine
                styles={styles}
                label={
                  data.isFinal
                    ? PDF_LOCALE.paymentAmountFinal
                    : data.isDP
                      ? PDF_LOCALE.paymentAmountDP
                      : PDF_LOCALE.paymentAmount
                }
                value={formatPdfCurrency(data.total)}
              />
            )}
            <PdfPricingLine
              styles={styles}
              label={PDF_LOCALE.taxes}
              value={formatPdfCurrency(data.taxes)}
            />
            {!data.isFinal && data.alreadyPaid > 0 && (
              <PdfPricingLine
                styles={styles}
                label={PDF_LOCALE.alreadyPaid}
                value={formatPdfCurrency(data.alreadyPaid)}
                muted
              />
            )}
            <View style={styles.totalRow}>
              <View style={styles.totalLabel}>
                <Text style={styles.totalLabelText}>{PDF_LOCALE.total}</Text>
              </View>
              <View style={styles.totalValue}>
                <Text style={styles.totalValueText}>
                  {formatPdfCurrency(data.total)}
                </Text>
              </View>
            </View>
          </View>
        </View>
        <Text style={styles.documentFooter} fixed>
          {PDF_LOCALE.thankYouMessage}
        </Text>
      </Page>
    </Document>
  )
}
