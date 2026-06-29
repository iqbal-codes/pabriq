import {
  Document,
  Font,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from '@react-pdf/renderer'
import {
  formatPdfCurrency,
  formatPdfDate,
  formatPdfPercent,
} from '../pdf-format'
import { PDF_LOCALE } from '../pdf-locale'
import type { InvoicePdfData } from '../types'

Font.register({
  family: 'Helvetica',
  fonts: [],
})

const BLUE = '#0075ff'
const LIGHT_BLUE = '#f2f8fe'
const GRAY_LABEL = '#9595a8'
const DARK = '#000000'

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    padding: 40,
    paddingBottom: 60,
    color: DARK,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 40,
  },
  logoWrap: {
    width: '50%',
  },
  logo: {
    maxWidth: 120,
    maxHeight: 120,
  },
  metaWrap: {
    width: '40%',
  },
  title: {
    textAlign: 'right',
    fontWeight: 600,
    fontSize: 36,
    marginBottom: 5,
    height: 36,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  metaLabel: {
    width: 118,
    marginLeft: 'auto',
  },
  metaLabelText: {
    padding: '4 12',
    letterSpacing: 0.2,
    fontSize: 12,
    color: GRAY_LABEL,
  },
  metaValue: {
    width: 115,
  },
  metaValueText: {
    padding: '4 12',
    textAlign: 'right',
    fontSize: 12,
  },
  addressRow: {
    flexDirection: 'row',
    marginTop: 40,
  },
  addressCol: {
    width: '50%',
  },
  addressTitle: {
    padding: '4 12',
    fontSize: 14,
    fontWeight: 600,
  },
  addressBold: {
    padding: '4 12',

    fontWeight: 500,
  },
  addressLine: {
    padding: '4 12',
  },
  addressRight: {
    textAlign: 'right',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: BLUE,
    marginBottom: 5,
  },
  tableHeaderCell: {
    padding: '4 13',
    fontWeight: 500,
    color: '#ffffff',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 4,
    borderBottomColor: LIGHT_BLUE,
  },
  tableCell: {
    padding: '4 13 10',
  },
  tableCellRight: {
    padding: '4 13 10',
    textAlign: 'left',
  },
  colDesc: { width: '30%' },
  colRate: { width: '25%' },
  colQty: { width: '10%' },
  colTax: { width: '10%' },
  colAmt: { width: '25%' },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 50,
  },
  notesSection: {
    width: '50%',
  },
  notesTitle: {
    padding: '4 12',
    fontSize: 12,
    fontWeight: 600,
  },
  notesText: {
    padding: '4 12',
    width: '100%',
  },
  pricingSection: {
    width: '50%',
  },
  pricingLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  pricingLabel: {
    width: '50%',
  },
  pricingLabelText: {
    padding: '4 12',
    textAlign: 'left',
    fontWeight: 500,
    fontSize: 12,
  },
  pricingValue: {
    width: '50%',
  },
  pricingValueText: {
    padding: '4 12',
    textAlign: 'right',
    fontWeight: 500,
    fontSize: 12,
  },
  totalRow: {
    flexDirection: 'row',
    backgroundColor: LIGHT_BLUE,
    height: 50,
    justifyContent: 'space-between',
    marginTop: 20,
  },
  totalLabel: {
    justifyContent: 'center',
  },
  totalLabelText: {
    padding: '4 12',
    textAlign: 'left',
    fontSize: 12,
    fontWeight: 500,
  },
  totalValue: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  totalValueText: {
    padding: '4 12',
    textAlign: 'right',
    fontSize: 12,
    fontWeight: 500,
  },
  alreadyPaidLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  alreadyPaidLabelText: {
    padding: '4 12',
    textAlign: 'left',
    fontWeight: 500,
    fontSize: 12,
    color: GRAY_LABEL,
  },
  alreadyPaidValueText: {
    padding: '4 12',
    textAlign: 'right',
    fontWeight: 500,
    fontSize: 12,
    color: GRAY_LABEL,
  },
})

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
            <View style={styles.metaRow}>
              <View style={styles.metaLabel}>
                <Text style={styles.metaLabelText}>
                  {PDF_LOCALE.invoiceNo}:
                </Text>
              </View>
              <View style={styles.metaValue}>
                <Text style={styles.metaValueText}>{data.invoiceNumber}</Text>
              </View>
            </View>
            <View style={styles.metaRow}>
              <View style={styles.metaLabel}>
                <Text style={styles.metaLabelText}>
                  {PDF_LOCALE.invoiceDate}:
                </Text>
              </View>
              <View style={styles.metaValue}>
                <Text style={styles.metaValueText}>
                  {formatPdfDate(data.issuedDate)}
                </Text>
              </View>
            </View>
            <View style={styles.metaRow}>
              <View style={styles.metaLabel}>
                <Text style={styles.metaLabelText}>{PDF_LOCALE.due}:</Text>
              </View>
              <View style={styles.metaValue}>
                <Text style={styles.metaValueText}>
                  {formatPdfDate(data.dueDate)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.addressRow}>
          <View style={styles.addressCol}>
            <Text style={styles.addressTitle}>{PDF_LOCALE.billFrom}</Text>
            <Text style={styles.addressBold}>{data.org.name}</Text>
            {data.org.email && (
              <Text style={styles.addressLine}>{data.org.email}</Text>
            )}
            {data.org.phone && (
              <Text style={styles.addressLine}>+62{data.org.phone}</Text>
            )}
            {data.org.address && (
              <Text style={styles.addressLine}>{data.org.address}</Text>
            )}
          </View>
          <View style={styles.addressCol}>
            <Text style={[styles.addressTitle, styles.addressRight]}>
              {PDF_LOCALE.billTo}
            </Text>
            <Text style={[styles.addressBold, styles.addressRight]}>
              {data.customer.name}
            </Text>
            {data.customer.email && (
              <Text style={[styles.addressLine, styles.addressRight]}>
                {data.customer.email}
              </Text>
            )}
            {data.customer.phone && (
              <Text style={[styles.addressLine, styles.addressRight]}>
                +62{data.customer.phone}
              </Text>
            )}
            {data.customer.address && (
              <Text style={[styles.addressLine, styles.addressRight]}>
                {data.customer.address}
              </Text>
            )}
            {data.shippingAddress && (
              <Text style={[styles.addressLine, styles.addressRight]}>
                {[
                  data.shippingAddress.streetAddress,
                  data.shippingAddress.areaName,
                ]
                  .filter(Boolean)
                  .join(', ')}
              </Text>
            )}
          </View>
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
            <View style={styles.pricingLine}>
              <View style={styles.pricingLabel}>
                <Text style={styles.pricingLabelText}>
                  {PDF_LOCALE.subtotal}
                </Text>
              </View>
              <View style={styles.pricingValue}>
                <Text style={styles.pricingValueText}>
                  {formatPdfCurrency(data.subtotal)}
                </Text>
              </View>
            </View>
            <View style={styles.pricingLine}>
              <View style={styles.pricingLabel}>
                <Text style={styles.pricingLabelText}>{PDF_LOCALE.taxes}</Text>
              </View>
              <View style={styles.pricingValue}>
                <Text style={styles.pricingValueText}>
                  {formatPdfCurrency(data.taxes)}
                </Text>
              </View>
            </View>
            {data.alreadyPaid > 0 && (
              <View style={styles.alreadyPaidLine}>
                <View style={styles.pricingLabel}>
                  <Text style={styles.alreadyPaidLabelText}>
                    {PDF_LOCALE.alreadyPaid}
                  </Text>
                </View>
                <View style={styles.pricingValue}>
                  <Text style={styles.alreadyPaidValueText}>
                    {formatPdfCurrency(data.alreadyPaid)}
                  </Text>
                </View>
              </View>
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
      </Page>
    </Document>
  )
}
