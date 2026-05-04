import {
  Document,
  Font,
  Page,
  StyleSheet,
  Text,
  View,
} from '@react-pdf/renderer'
import type { QuotationPdfData } from '../types'

Font.register({
  family: 'Helvetica',
  fonts: [],
})

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    padding: 40,
    paddingBottom: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  orgName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  metaSection: {
    marginBottom: 16,
  },
  metaRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  metaLabel: {
    width: 100,
    fontWeight: 'bold',
  },
  metaValue: {},
  customerSection: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f5f5f5',
  },
  customerName: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  customerDetail: {
    fontSize: 9,
    marginBottom: 2,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#333333',
    color: '#ffffff',
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginBottom: 2,
  },
  tableHeaderCell: {
    fontSize: 8,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: 1,
    borderColor: '#e0e0e0',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  tableCell: {
    fontSize: 9,
    textAlign: 'center',
  },
  colProduct: { flex: 3 },
  colVariant: { flex: 1.5 },
  colQty: { width: 50 },
  colUnit: { width: 70 },
  colTotal: { width: 80 },
  pricingSection: {
    marginTop: 16,
    alignItems: 'flex-end',
  },
  pricingRow: {
    flexDirection: 'row',
    marginBottom: 4,
    width: 200,
  },
  pricingLabel: {
    flex: 1,
    fontSize: 10,
  },
  pricingValue: {
    width: 100,
    fontSize: 10,
    textAlign: 'right',
  },
  grandTotalRow: {
    flexDirection: 'row',
    marginTop: 4,
    paddingTop: 4,
    borderTop: 2,
    borderColor: '#333333',
    width: 200,
  },
  grandTotalLabel: {
    flex: 1,
    fontSize: 12,
    fontWeight: 'bold',
  },
  grandTotalValue: {
    width: 100,
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'right',
  },
  termsSection: {
    marginTop: 30,
    padding: 12,
    borderTop: 1,
    borderColor: '#cccccc',
  },
  termsTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  termsText: {
    fontSize: 8,
    color: '#666666',
    lineHeight: 1.4,
  },
  signaturesSection: {
    marginTop: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  signatureBlock: {
    width: 150,
    alignItems: 'center',
  },
  signaturePlaceholder: {
    height: 40,
    width: 150,
    borderBottom: 1,
    borderColor: '#cccccc',
    marginBottom: 8,
  },
  signatureLabel: {
    fontSize: 9,
    color: '#666666',
  },
})

function formatDate(date: Date): string {
  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

interface QuotationDocumentProps {
  data: QuotationPdfData
}

export function QuotationDocument({ data }: QuotationDocumentProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.orgName}>{data.orgName}</Text>
            {data.orgPhone && (
              <Text style={{ fontSize: 9 }}>{data.orgPhone}</Text>
            )}
          </View>
        </View>

        <Text style={styles.title}>PENAWARAN</Text>

        <View style={styles.metaSection}>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Nomor</Text>
            <Text style={styles.metaValue}>{data.quoteNumber}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Tanggal</Text>
            <Text style={styles.metaValue}>{formatDate(data.createdAt)}</Text>
          </View>
          {data.validUntil && (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Berlaku hingga</Text>
              <Text style={styles.metaValue}>
                {formatDate(data.validUntil)}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.customerSection}>
          <Text style={styles.customerName}>{data.customer.name}</Text>
          {data.customer.email && (
            <Text style={styles.customerDetail}>{data.customer.email}</Text>
          )}
          {data.customer.phone && (
            <Text style={styles.customerDetail}>{data.customer.phone}</Text>
          )}
          {data.customer.address && (
            <Text style={styles.customerDetail}>{data.customer.address}</Text>
          )}
        </View>

        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderCell, styles.colProduct]}>
            Produk
          </Text>
          <Text style={[styles.tableHeaderCell, styles.colQty]}>Qty</Text>
          <Text style={[styles.tableHeaderCell, styles.colUnit]}>
            Harga Satuan
          </Text>
          <Text style={[styles.tableHeaderCell, styles.colTotal]}>Total</Text>
        </View>

        {data.lineItems.map((item) => (
          <View
            key={`${item.productName}-${item.quantity}-${item.unitPrice}`}
            style={styles.tableRow}
          >
            <Text style={[styles.tableCell, styles.colProduct]}>
              {item.productName}
            </Text>
            <Text style={[styles.tableCell, styles.colQty]}>
              {item.quantity}
            </Text>
            <Text style={[styles.tableCell, styles.colUnit]}>
              {formatCurrency(item.unitPrice)}
            </Text>
            <Text style={[styles.tableCell, styles.colTotal]}>
              {formatCurrency(item.total)}
            </Text>
          </View>
        ))}

        <View style={styles.pricingSection}>
          <View style={styles.pricingRow}>
            <Text style={styles.pricingLabel}>Subtotal</Text>
            <Text style={styles.pricingValue}>
              {formatCurrency(data.grandTotal)}
            </Text>
          </View>
          <View style={{ height: 8 }} />
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>TOTAL</Text>
            <Text style={styles.grandTotalValue}>
              {formatCurrency(data.grandTotal)}
            </Text>
          </View>
        </View>

        <View style={styles.termsSection}>
          <Text style={styles.termsTitle}>Syarat dan Ketentuan:</Text>
          <Text style={styles.termsText}>
            Terima kasih atas kepercayaan Anda. Harga belum termasuk PPN.
            Pembayaran dilakukan melalui transfer bank ke rekening yang akan
            diinformasikan pada invoice. Penawaran ini berlaku sampai dengan
            tanggal yang tertera di atas. Spesifikasi dan harga dapat berubah
            tanpa pemberitahuan sebelumnya.
          </Text>
        </View>

        <View style={styles.signaturesSection}>
          <View style={styles.signatureBlock}>
            <View style={styles.signaturePlaceholder} />
            <Text style={styles.signatureLabel}>Hormat kami</Text>
          </View>
          <View style={styles.signatureBlock}>
            <View style={styles.signaturePlaceholder} />
            <Text style={styles.signatureLabel}>Penerima</Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}
