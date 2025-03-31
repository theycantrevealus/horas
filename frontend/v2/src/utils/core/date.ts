import moment from 'moment'
class DateManagement {
  formatDate(date, format) {
    return moment(date).format(format)
  }

  formatUtc(date) {
    return moment.utc(date).toDate()
  }
}

export default new DateManagement()
