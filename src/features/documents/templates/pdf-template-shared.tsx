import { Text, View } from '@react-pdf/renderer'
import type React from 'react'

import type { PdfStyles } from './pdf-template-constants'
import { PDF_COLORS } from './pdf-template-constants'

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
  const addressLinesWithKeys = (() => {
    const seen = new Map<string, number>()

    return addressLines.map((line) => {
      const occurrence = seen.get(line) ?? 0
      seen.set(line, occurrence + 1)

      return { key: `${line}:${occurrence}`, line }
    })
  })()

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
      {addressLinesWithKeys.map(({ key, line }) => (
        <Text
          key={key}
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
