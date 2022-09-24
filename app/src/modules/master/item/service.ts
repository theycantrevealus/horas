import axios from 'axios'

class MasterItemService {
  /**
   * @brief List all item data with pagination
   * @param parsedData Object Base. request: parsedData.default is 'list'
   * {
   *  request: 'list' <Default is 'list'>,
   *  first: 0,
   *  rows: 10 'or this.$refs.dt.rows',
   *  sortField: null,
   *  sortOrder: null,
   *  filters: {
        columnName: { value: '', matchMode: 'contains' },
        anotherColumnName: { value: '', matchMode: 'contains' }
      }
   * }
   * @returns
   */
  getItemList(parsedData) {
    return axios
      .get(`${process.env.VUE_APP_APIGATEWAY}v1/master/item/paginate`, {
        params: parsedData,
      })
      .then((response: any) => {
        return Promise.resolve(response)
      })
  }

  getItemDetail(uid) {
    return axios
      .get(`${process.env.VUE_APP_APIGATEWAY}v1/master/item/${uid}`)
      .then((response: any) => {
        return Promise.resolve(response)
      })
  }
}

export default new MasterItemService()
