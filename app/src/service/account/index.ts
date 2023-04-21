import axios, {AxiosResponse} from 'axios'
import { TAccountLogin } from '@/model/Account'
import {CoreResponse} from "@/model/Response"
import api from "@/util/api"

class AccountService {
  async signIn(accountData: TAccountLogin):Promise<CoreResponse> {
    return await api({ requiresAuth: true })
      .post(`${process.env.VUE_APP_APIGATEWAY}v1/account/signin`, accountData)
      .then(async (response: AxiosResponse) => {
        const data: CoreResponse = response.data
        return Promise.resolve(data)
      })
      .catch((e: Error) => {
        return Promise.reject(e)
      })
  }
}

export default new AccountService()
