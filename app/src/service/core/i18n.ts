import api from '@/util/api'
import process from 'process'
import {AxiosResponse} from "axios";
import {CoreResponse} from "@/model/Response";

class Corei18nService {
  async generatei18n() {
    return await api({ requiresAuth: true })
      .get(`${process.env.VUE_APP_APIGATEWAY}/v1/i18n/all`)
      .then((response) => {
        const data: CoreResponse = response.data
        return Promise.resolve(data)
      })
      .catch((e) => {
        return Promise.reject(e)
      })
  }
}

export default new Corei18nService()
