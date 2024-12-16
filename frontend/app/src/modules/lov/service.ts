import api from '@/util/api'
import {ISupplier} from "@/model/Supplier";
import {CoreResponse} from "@/model/Response";
import {AxiosResponse} from "axios";
import process from 'process'

class LOVService {
  getLOVList(parsedData) {
    return api({ requiresAuth: true })
      .get(`${process.env.VUE_APP_APIGATEWAY}/v1/lov`, {
        params: {
          lazyEvent: JSON.stringify(parsedData)
        },
      })
      .then((response: any) => {
        const data:CoreResponse = response.data
        return data
      })
      .catch((e) => {
        return Promise.reject(e)
      })
  }

  async findLOV(term: string) {
    return await api({ requiresAuth: true })
      .get(`${process.env.VUE_APP_APIGATEWAY}/v1/lov?q=${term}`)
      .then((response:AxiosResponse) => {
        return Promise.resolve(response)
      })
  }

  async getLOVDetail(id) {
    return await api({ requiresAuth: true })
      .get(`${process.env.VUE_APP_APIGATEWAY}/v1/lov/${id}`)
      .then((response:AxiosResponse) => {
        return Promise.resolve(response)
      })
  }

  async addLOV(data) {
    return await api({requiresAuth: true})
      .post(`${process.env.VUE_APP_APIGATEWAY}/v1/lov`, data)
      .then((response:AxiosResponse) => {
        const data:CoreResponse = response.data
        return data
      })
  }

  async editLOV(id, data) {
    return await api({requiresAuth: true})
      .patch(`${process.env.VUE_APP_APIGATEWAY}/v1/lov/${id}`, data)
      .then((response:AxiosResponse) => {
        const data:CoreResponse = response.data
        return data
      })
  }

  async deleteLOV(id) {
    return await api({ requiresAuth: true })
      .delete(`${process.env.VUE_APP_APIGATEWAY}/v1/lov/${id}`)
      .then((response: any) => {
        return Promise.resolve(response)
      })
  }
}

export default new LOVService()
