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

  getTimezone(target) {
    return moment().tz(target).format('L hh:mm:ss')
  }
}
