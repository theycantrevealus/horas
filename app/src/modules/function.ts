import moment from 'moment'
class DateManagement {
  formatDate(date, format) {
    return moment(date).format(format)
  }
}

export default new DateManagement()
