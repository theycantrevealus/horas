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

  getTimezone(target) {
    // return moment.tz(Date.now(), target).format('YYYY-MM-DD HH:mm:ss')
    // return new Date(moment().utcOffset('+7').format('YYYY-MM-DD HH:mm:ss'))
    return moment.utc(moment.tz(target).format('YYYY-MM-DDTHH:mm:ss')).toDate()
    //return moment.utc(moment.tz(target).format('YYYY-MM-DDTHH:mm:ss')).toDate()
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
