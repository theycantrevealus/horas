const moment = require('moment-timezone')

export class TimeManagement {
  private currentdate
  private rawDate
  private timezones: any
  constructor() {
    this.currentdate = new Date()
    this.rawDate =
      this.currentdate.getDate() +
      '-' +
      (this.currentdate.getMonth() + 1) +
      '-' +
      this.currentdate.getFullYear() +
      ' ' +
      this.currentdate.getHours() +
      ':' +
      this.currentdate.getMinutes() +
      ':' +
      this.currentdate.getSeconds()
  }

  async getTimeRaw() {
    return this.rawDate
  }

  // getTimezone(target) {
  //   return moment().tz(target).format('L hh:mm:ss')
  // }

  async validateFormat(format, input) {
    return moment(input, format, true).isValid()
  }

  getTimezone(target, format = 'YYYY-MM-DDTHH:mm:ss') {
    return moment.utc(moment.tz(target).format(format)).toDate()
  }

  getRaw(target, format = 'YYYY-MM-DDTHH:mm:ss') {
    return moment.tz(target).format(format)
  }

  getUTC() {
    return moment.utc().format('YYYY-MM-DD HH:mm:ss')
  }

  getMoment() {
    return moment
  }

  parseDate(s) {
    const re = /^(\d\d)-(\d\d)-(\d{4}) (\d\d):(\d\d):(\d\d)$/
    const m = re.exec(s)
    return m
      ? new Date(
          parseInt(m[3]),
          parseInt(m[2]) - 1,
          parseInt(m[1]),
          parseInt(m[4]),
          parseInt(m[5]),
          parseInt(m[6])
        )
      : null
  }

  getDate(format = 'YYYY-MM-DD') {
    return moment().format(format)
  }

  format(target, format) {
    return moment(target).format(format)
  }
  addTime(from, gap: number, unit: string, format = '', target = '') {
    return moment(moment(from, format).tz(target).add(gap, unit)).format(format)
  }

  subtractTime(from, gap: number, unit: string, format = '', target = '') {
    return moment(moment(from).tz(target).subtract(gap, unit)).format(format)
  }
}
