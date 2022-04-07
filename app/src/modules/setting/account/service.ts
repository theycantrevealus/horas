import axios from 'axios'
import store from '@/store'
class AccountService {
  async getAccountList (parsedData) {
    axios.defaults.headers.common.Authorization = `Bearer ${store.state.credential.token}`
    return axios.get(`${process.env.VUE_APP_APIGATEWAY}account/paginate`, {
      params: parsedData
    })
      .then((response: any) => {
        return Promise.resolve(response)
      })
  }

  getAccountDetail (uid) {
    axios.defaults.headers.common.Authorization = `Bearer ${store.state.credential.token}`
    return axios.get(`${process.env.VUE_APP_APIGATEWAY}Inventory/detail/${uid}`)
      .then((response: any) => {
        return Promise.resolve(response.data)
      })
  }
}

export default new AccountService()
