import api from "@/util/api";
import {AxiosResponse} from "axios";
import {CoreResponse} from "@/model/Response";

class ApplicationConfiguration {
  async getApplicationConfig() {
    return await api({ requiresAuth: true })
      .get(`${process.env.VUE_APP_APIGATEWAY}v1/configuration/configured`)
      .then(async (response: AxiosResponse) => {
        const data: CoreResponse = response.data
        return Promise.resolve(data)
      })
      .catch((e: Error) => {
        return Promise.reject(e)
      })
  }

  async getApplicationList() {

  }
}

export default new ApplicationConfiguration()
