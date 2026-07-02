import type React from 'react'
import type { Style } from '@react-pdf/types'
import { Font, StyleSheet, Text, View } from '@react-pdf/renderer'

export const PDF_COLORS = {
  BLUE: '#0075ff',
  LIGHT_BLUE: '#f2f8fe',
  GRAY_LABEL: '#9595a8',
  DARK: '#000000',
} as const

let fontsRegistered = false

export function registerPdfFonts(): void {
  if (fontsRegistered) return
  Font.register({ family: 'Helvetica', fonts: [] })
  fontsRegistered = true
}

export interface PdfStyles {
  page: Style
  topRow: Style
  logoWrap: Style
  logo: Style
  metaWrap: Style
  title: Style
  metaRow: Style
  metaLabel: Style
  metaLabelText: Style
  metaValue: Style
  metaValueText: Style
  addressRow: Style
  addressCol: Style
  addressTitle: Style
  addressBold: Style
  addressLine: Style
  addressRight: Style
  tableHeader: Style
  tableHeaderCell: Style
  tableRow: Style
  tableCell: Style
  tableCellRight: Style
  colDesc: Style
  colRate: Style
  colQty: Style
  colTax: Style
  colAmt: Style
  footerRow: Style
  notesSection: Style
  notesTitle: Style
  notesText: Style
  pricingSection: Style
  pricingLine: Style
  pricingLabel: Style
  pricingLabelText: Style
  pricingValue: Style
  pricingValueText: Style
  totalRow: Style
  totalLabel: Style
  totalLabelText: Style
  totalValue: Style
  totalValueText: Style
  alreadyPaidLine: Style
  alreadyPaidLabelText: Style
  alreadyPaidValueText: Style
}

export function createPdfStyles(variant: 'invoice' | 'quotation'): PdfStyles {
  const isInvoice = variant === 'invoice'
  return StyleSheet.create({
    page: {
      fontFamily: 'Helvetica',
      fontSize: 10,
      padding: 40,
      paddingBottom: 60,
      color: PDF_COLORS.DARK,
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
      maxWidth: isInvoice ? 120 : 150,
      maxHeight: isInvoice ? 120 : 174,
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
      fontSize: isInvoice ? 12 : 14,
      color: PDF_COLORS.GRAY_LABEL,
    },
    metaValue: {
      width: 115,
    },
    metaValueText: {
      padding: '4 12',
      textAlign: 'right',
      fontSize: isInvoice ? 12 : 14,
    },
    addressRow: {
      flexDirection: 'row',
      marginTop: 40,
    },
    addressCol: {
      width: '50%',
    },
    addressTitle: {
      padding: isInvoice ? '4 12' : '4 12 17',
      fontSize: isInvoice ? 14 : 17,
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
      backgroundColor: PDF_COLORS.BLUE,
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
      borderBottomColor: PDF_COLORS.LIGHT_BLUE,
    },
    tableCell: {
      padding: '4 13 10',
    },
    tableCellRight: {
      padding: '4 13 10',
      textAlign: isInvoice ? 'left' : 'right',
    },
    colDesc: { width: isInvoice ? '30%' : '31%' },
    colRate: { width: isInvoice ? '22%' : '17%' },
    colQty: { width: isInvoice ? '10%' : '17%' },
    colTax: { width: isInvoice ? '13%' : '17%' },
    colAmt: { width: isInvoice ? '25%' : '18%' },
    footerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 50,
    },
    notesSection: {
      width: '50%',
    },
    notesTitle: {
      padding: isInvoice ? '4 12' : '4 12 17',
      fontSize: isInvoice ? 12 : 17,
      fontWeight: 600,
    },
    notesText: {
      padding: '4 12',
      width: '100%',
    },
    pricingSection: {
      width: isInvoice ? '50%' : '40%',
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
      fontSize: isInvoice ? 12 : 15,
    },
    pricingValue: {
      width: '50%',
    },
    pricingValueText: {
      padding: '4 12',
      textAlign: 'right',
      fontWeight: 500,
      fontSize: isInvoice ? 12 : 15,
    },
    totalRow: {
      flexDirection: 'row',
      backgroundColor: PDF_COLORS.LIGHT_BLUE,
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
      fontSize: isInvoice ? 12 : 15,
      fontWeight: 500,
    },
    totalValue: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    totalValueText: {
      padding: '4 12',
      textAlign: 'right',
      fontSize: isInvoice ? 12 : 15,
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
      color: PDF_COLORS.GRAY_LABEL,
    },
    alreadyPaidValueText: {
      padding: '4 12',
      textAlign: 'right',
      fontWeight: 500,
      fontSize: 12,
      color: PDF_COLORS.GRAY_LABEL,
    },
  }) as PdfStyles
}

export function PdfMetaRow(props: {
  styles: PdfStyles
  label: string
  value: string
}): React.ReactElement {
  const { styles, label, value } = props
  return (
    <View style={styles.metaRow}>
      <View style={styles.metaLabel}>
        <Text style={styles.metaLabelText}>{label}:</Text>
      </View>
      <View style={styles.metaValue}>
        <Text style={styles.metaValueText}>{value}</Text>
      </View>
    </View>
  )
}

export function PdfAddressBlock(props: {
  styles: PdfStyles
  title: string
  name: string
  addressLines: string[]
  align?: 'left' | 'right'
}): React.ReactElement {
  const { styles, title, name, addressLines, align = 'left' } = props
  const isRight = align === 'right'
  return (
    <View style={styles.addressCol}>
      <Text
        style={
          isRight
            ? [styles.addressTitle, styles.addressRight]
            : styles.addressTitle
        }
      >
        {title}
      </Text>
      <Text
        style={
          isRight
            ? [styles.addressBold, styles.addressRight]
            : styles.addressBold
        }
      >
        {name}
      </Text>
      {addressLines.map((line, i) => (
        <Text
          key={i}
          style={
            isRight
              ? [styles.addressLine, styles.addressRight]
              : styles.addressLine
          }
        >
          {line}
        </Text>
      ))}
    </View>
  )
}

export function PdfPricingLine(props: {
  styles: PdfStyles
  label: string
  value: string
  muted?: boolean
}): React.ReactElement {
  const { styles, label, value, muted } = props
  const labelStyle = muted
    ? [styles.pricingLabelText, { color: PDF_COLORS.GRAY_LABEL }]
    : styles.pricingLabelText
  const valueStyle = muted
    ? [styles.pricingValueText, { color: PDF_COLORS.GRAY_LABEL }]
    : styles.pricingValueText
  return (
    <View style={styles.pricingLine}>
      <View style={styles.pricingLabel}>
        <Text style={labelStyle}>{label}</Text>
      </View>
      <View style={styles.pricingValue}>
        <Text style={valueStyle}>{value}</Text>
      </View>
    </View>
  )
}
