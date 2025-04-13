export interface Ii18nNumberCurrency {
  style: string
  currency: string
  notation: string
}

export interface Ii18nNumberDecimal {
  style: string
  maximumFractionDigits: number
  minimumFractionDigits: number
}

export interface Ii18nNumberPercent {
  style: string
  useGrouping: boolean
}

export interface Ii18nNumber {
  currency: Ii18nNumberCurrency
  decimal: Ii18nNumberDecimal
  percent: Ii18nNumberPercent
}
