import {
  Document,
  Font,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from '@react-pdf/renderer'
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
    maxWidth: 150,
    maxHeight: 174,
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
    fontSize: 14,
    letterSpacing: 0.2,
    color: GRAY_LABEL,
  },
  metaValue: {
    width: 115,
  },
  metaValueText: {
    padding: '4 12',
    textAlign: 'right',
    fontSize: 14,
  },
  addressRow: {
    flexDirection: 'row',
    marginTop: 40,
  },
  addressCol: {
    width: '50%',
  },
  addressTitle: {
    padding: '4 12 17',
    fontSize: 17,
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
    textAlign: 'right',
  },
  colDesc: { width: '31%' },
  colRate: { width: '17%' },
  colQty: { width: '17%' },
  colTax: { width: '17%' },
  colAmt: { width: '18%' },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 50,
  },
  notesSection: {
    width: '50%',
  },
  notesTitle: {
    padding: '4 12 17',
    fontSize: 17,
    fontWeight: 600,
  },
  notesText: {
    padding: '4 12',
    width: '100%',
  },
  pricingSection: {
    width: '40%',
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
    fontSize: 15,
  },
  pricingValue: {
    width: '50%',
  },
  pricingValueText: {
    padding: '4 12',
    textAlign: 'right',
    fontWeight: 500,
    fontSize: 15,
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
    fontSize: 15,
    fontWeight: 500,
  },
  totalValue: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  totalValueText: {
    padding: '4 12',
    textAlign: 'right',
    fontSize: 15,
    fontWeight: 500,
  },
})

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  })
}

function formatPercent(pct: number): string {
  return `${pct.toFixed(2)}%`
}

const LINE_TYPE_LABELS: Record<string, string> = {
  product: '',
  shipping: '[Shipping] ',
  fee: '[Fee] ',
  discount: '[Discount] ',
  tax: '[Tax] ',
}

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
            <Text style={styles.title}>Invoice</Text>
            <View style={styles.metaRow}>
              <View style={styles.metaLabel}>
                <Text style={styles.metaLabelText}>Invoice no.:</Text>
              </View>
              <View style={styles.metaValue}>
                <Text style={styles.metaValueText}>{data.invoiceNumber}</Text>
              </View>
            </View>
            <View style={styles.metaRow}>
              <View style={styles.metaLabel}>
                <Text style={styles.metaLabelText}>Invoice date:</Text>
              </View>
              <View style={styles.metaValue}>
                <Text style={styles.metaValueText}>
                  {formatDate(data.issuedDate)}
                </Text>
              </View>
            </View>
            <View style={styles.metaRow}>
              <View style={styles.metaLabel}>
                <Text style={styles.metaLabelText}>Due:</Text>
              </View>
              <View style={styles.metaValue}>
                <Text style={styles.metaValueText}>
                  {formatDate(data.dueDate)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.addressRow}>
          <View style={styles.addressCol}>
            <Text style={styles.addressTitle}>Bill From</Text>
            <Text style={styles.addressBold}>{data.org.name}</Text>
            {data.org.email && (
              <Text style={styles.addressLine}>{data.org.email}</Text>
            )}
            {data.org.phone && (
              <Text style={styles.addressLine}>{data.org.phone}</Text>
            )}
            {data.org.address && (
              <Text style={styles.addressLine}>{data.org.address}</Text>
            )}
          </View>
          <View style={styles.addressCol}>
            <Text style={[styles.addressTitle, styles.addressRight]}>
              Bill To
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
                {data.customer.phone}
              </Text>
            )}
            {data.customer.address && (
              <Text style={[styles.addressLine, styles.addressRight]}>
                {data.customer.address}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderCell, styles.colDesc]}>
            DESCRIPTION
          </Text>
          <Text style={[styles.tableHeaderCell, styles.colRate]}>
            RATE, IDR
          </Text>
          <Text style={[styles.tableHeaderCell, styles.colQty]}>QTY/HRS</Text>
          <Text style={[styles.tableHeaderCell, styles.colTax]}>TAX</Text>
          <Text style={[styles.tableHeaderCell, styles.colAmt]}>
            AMOUNT, IDR
          </Text>
        </View>

        {data.lineItems.map((item) => (
          <View
            key={`${item.description}-${item.quantity}-${item.unitPrice}`}
            style={styles.tableRow}
          >
            <Text style={[styles.tableCell, styles.colDesc]}>
              {item.lineType && LINE_TYPE_LABELS[item.lineType]}
              {item.description}
            </Text>
            <Text style={[styles.tableCellRight, styles.colRate]}>
              {formatCurrency(item.unitPrice)}
            </Text>
            <Text style={[styles.tableCellRight, styles.colQty]}>
              {item.quantity}
            </Text>
            <Text style={[styles.tableCellRight, styles.colTax]}>
              {formatPercent(item.taxPercent)}
            </Text>
            <Text style={[styles.tableCellRight, styles.colAmt]}>
              {formatCurrency(item.total)}
            </Text>
          </View>
        ))}

        <View style={styles.footerRow}>
          <View style={styles.notesSection}>
            {(data.notes || data.paymentMethod) && (
              <View>
                <Text style={styles.notesTitle}>
                  Payment Instructions or other notes
                </Text>
                {data.paymentMethod && (
                  <Text style={styles.notesText}>
                    {data.paymentMethod.name}
                    {data.paymentMethod.bankName ||
                    data.paymentMethod.accountNumber
                      ? `\nBank : ${data.paymentMethod.bankName ?? ''}`
                      : ''}
                    {data.paymentMethod.accountNumber
                      ? `\nNo. Rekening : ${data.paymentMethod.accountNumber}`
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
                <Text style={styles.pricingLabelText}>Subtotal</Text>
              </View>
              <View style={styles.pricingValue}>
                <Text style={styles.pricingValueText}>
                  {formatCurrency(data.subtotal)}
                </Text>
              </View>
            </View>
            <View style={styles.pricingLine}>
              <View style={styles.pricingLabel}>
                <Text style={styles.pricingLabelText}>Taxes</Text>
              </View>
              <View style={styles.pricingValue}>
                <Text style={styles.pricingValueText}>
                  {formatCurrency(data.taxes)}
                </Text>
              </View>
            </View>
            <View style={styles.totalRow}>
              <View style={styles.totalLabel}>
                <Text style={styles.totalLabelText}>Total</Text>
              </View>
              <View style={styles.totalValue}>
                <Text style={styles.totalValueText}>
                  {formatCurrency(data.total)}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  )
}
