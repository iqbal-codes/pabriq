import { Document, Image, Page, Text, View } from '@react-pdf/renderer'
import {
  formatPdfCurrency,
  formatPdfDate,
  formatPdfPercent,
} from '../pdf-format'
import { PDF_LOCALE } from '../pdf-locale'
import type { QuotationPdfData } from '../types'
import { createPdfStyles, registerPdfFonts } from './pdf-template-constants'
import {
  PdfAddressBlock,
  PdfMetaRow,
  PdfPricingLine,
} from './pdf-template-shared'

registerPdfFonts()

const styles = createPdfStyles('quotation')

interface QuotationDocumentProps {
  data: QuotationPdfData
}

// fallow-ignore-next-line unused-export — dynamically imported by documents/server.tsx
export function QuotationDocument({ data }: QuotationDocumentProps) {
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
            <Text style={styles.title}>{PDF_LOCALE.quotation}</Text>
            <PdfMetaRow
              styles={styles}
              label={PDF_LOCALE.quoteNo}
              value={data.quoteNumber}
            />
            <PdfMetaRow
              styles={styles}
              label={PDF_LOCALE.date}
              value={formatPdfDate(data.createdAt)}
            />
            {data.validUntil && (
              <PdfMetaRow
                styles={styles}
                label={PDF_LOCALE.validUntil}
                value={formatPdfDate(data.validUntil)}
              />
            )}
          </View>
        </View>

        <View style={styles.addressRow}>
          <PdfAddressBlock
            styles={styles}
            title={PDF_LOCALE.billFrom}
            name={data.org.name}
            addressLines={[
              data.org.email ?? '',
              data.org.phone ?? '',
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
              data.customer.phone ?? '',
              data.customer.address ?? '',
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
            {PDF_LOCALE.qtyHrs}
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
            {data.notes && (
              <View>
                <Text style={styles.notesTitle}>{PDF_LOCALE.notes}</Text>
                <Text style={styles.notesText}>{data.notes}</Text>
              </View>
            )}
          </View>
          <View style={styles.pricingSection}>
            <PdfPricingLine
              styles={styles}
              label={PDF_LOCALE.subtotal}
              value={formatPdfCurrency(data.subtotal)}
            />
            <PdfPricingLine
              styles={styles}
              label={PDF_LOCALE.taxes}
              value={formatPdfCurrency(data.taxes)}
            />
            <View style={styles.totalRow}>
              <View style={styles.totalLabel}>
                <Text style={styles.totalLabelText}>
                  {PDF_LOCALE.grandTotal}
                </Text>
              </View>
              <View style={styles.totalValue}>
                <Text style={styles.totalValueText}>
                  {formatPdfCurrency(data.grandTotal)}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  )
}
