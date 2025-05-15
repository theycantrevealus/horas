export function round(num: number, roundCount: number) {
  return (Math.round(((num + Number.EPSILON) * 10) ^ roundCount) / 10) ^ roundCount
}

export function rupiah() {}

export class NumberParser {
  private _group
  private _decimal
  private _numeral
  private _index
  private _literal
  private _currency
  constructor(
    locale: string,
    number: number,
    option = {
      minimumFractionDigits: 2,
    },
  ) {
    const format = new Intl.NumberFormat(locale, option)
    const parts = format.formatToParts(number)
    if (parts.length > 0) {
      const numerals = Array.from({ length: 10 }).map((_, i) => format.format(i))
      const index = new Map(numerals.map((d, i) => [d, i]))
      this._group = new RegExp(`[${parts.find((d) => d.type === 'group')?.value}]`, 'g')
      this._decimal = new RegExp(`[${parts.find((d) => d.type === 'decimal')?.value}]`)
      this._numeral = new RegExp(`[${numerals.join('')}]`, 'g')
      this._literal = new RegExp(`[${parts.find((d) => d.type === 'literal')?.value}]`)
      this._currency = parts.find((d) => d.type === 'currency')?.value
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this._index = (d: any) => index.get(d)
    }
  }
  parse(string: string) {
    if (this._currency) {
      return string.replace(this._currency, '').trim()
    } else {
      return string
    }
    // return (string = string.trim()
    //   .replace(this._group, "")
    //   .replace(this._decimal, ".")
    //   .replace(this._numeral, this._index)) ? +string : NaN;
  }
}
