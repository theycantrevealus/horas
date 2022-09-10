import axios from 'axios';

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
        if (parsedData.request === undefined) {
            parsedData.request = 'list';
        }
        return axios
            .post(`${process.env.VUE_APP_APIGATEWAY}Inventory`, parsedData)
            .then((response: any) => {
                return Promise.resolve(response.data.response_package);
            });
    }

    getItemDetail(uid) {
        return axios
            .get(`${process.env.VUE_APP_APIGATEWAY}Inventory/detail/${uid}`)
            .then((response: any) => {
                return Promise.resolve(response.data.response_package);
            });
    }
}

export default new MasterItemService();
