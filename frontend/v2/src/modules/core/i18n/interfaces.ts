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

export interface Ii18nDatetimeProperty {
  weekday?: string
  era?: string
  year?: string
  month?: string
  day?: string
  hour?: string
  minute?: string
  second?: string
  timezone_name?: string
  // weekday?: 'narrow' | 'short' | 'long'
  // era?: 'narrow' | 'short' | 'long'
  // year?: '2-digit' | 'numeric'
  // month?: '2-digit' | 'numeric' | 'narrow' | 'short' | 'long'
  // day?: '2-digit' | 'numeric'
  // hour?: '2-digit' | 'numeric'
  // minute?: '2-digit' | 'numeric'
  // second?: '2-digit' | 'numeric'
  // timezone_name?: 'short' | 'long'
}

export interface Ii18Datetime {
  short: Ii18nDatetimeProperty
  long: Ii18nDatetimeProperty
}

export interface IMenu {
  id: string
  name: string
  url: string
  identifier: string
}

export interface Ii18nComponent {
  component: string
  translation: string
  menu: IMenu
}

export interface i18nAdd {
  language_code: string
  iso_2_digits: string
  iso_3_digits: string
  name: string
  datetime: Ii18Datetime
  number: Ii18nNumber
  remark: string
  components: Ii18nComponent[]
}

export interface i18nEdit extends i18nAdd {
  __v: number
}
