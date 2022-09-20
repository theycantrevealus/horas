import axios from 'axios'
import { TAccountLogin } from '@/model/Account'

class AccountService {
  login(accountData: TAccountLogin) {
    return axios
      .post(`${process.env.VUE_APP_APIGATEWAY}account/login`, accountData)
      .then((response) => {
        axios.defaults.headers.common.Authorization = `Bearer ${response.data.token}`
        return Promise.resolve(response)
      })
  }
}

export default new AccountService()
