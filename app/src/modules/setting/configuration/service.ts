import api from "@/util/api";
import {AxiosResponse} from "axios";
import {CoreResponse} from "@/model/Response";
import process from 'process'
class ApplicationConfiguration {
  async getApplicationConfig() {
    return await api({ requiresAuth: true })
      .get(`${process.env.VUE_APP_APIGATEWAY}/v1/configuration/tree`)
      .then(async (response: AxiosResponse) => {
        const data: CoreResponse = response.data
        return Promise.resolve(data)
      })
      .catch((e: Error) => {
        return Promise.reject(e)
      })
  }

  async updateConfiguration(data) {
    return await api({requiresAuth: true})
      .patch(`${process.env.VUE_APP_APIGATEWAY}/v1/configuration/batch`, data)
      .then(async (response: AxiosResponse) => {
        const data: CoreResponse = response.data
        return Promise.resolve(data)
      })
      .catch((e: Error) => {
        return Promise.reject(e)
      })
  }
}

export default new ApplicationConfiguration()
