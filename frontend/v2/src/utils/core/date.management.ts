import moment from 'moment'
class DateManagement {
  formatDate(date: string, format: string) {
    return moment(date).format(format)
  }

  formatUtc(date: string) {
    return moment.utc(date).toDate()
  }
}

export default new DateManagement()
