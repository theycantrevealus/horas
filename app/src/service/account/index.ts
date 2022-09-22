import axios from 'axios'
import { TAccountLogin } from '@/model/Account'

class AccountService {
  async login(accountData: TAccountLogin) {
    return await axios
      .post(`${process.env.VUE_APP_APIGATEWAY}v1/account/login`, accountData)
      .then((response) => {
        axios.defaults.headers.common.Authorization = `Bearer ${response.data.token}`
        return Promise.resolve(response)
      })
  }
}

export default new AccountService()
