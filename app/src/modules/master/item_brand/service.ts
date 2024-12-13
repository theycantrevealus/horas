import api from '@/util/api'
import {ISupplier} from "@/model/Supplier";
import {CoreResponse} from "@/model/Response";
import {AxiosResponse} from "axios";
import process from 'process'

class MasterItemBrandService {
  getItemBrandList(parsedData) {
    return api({ requiresAuth: true })
      .get(`${process.env.VUE_APP_APIGATEWAY}/v1/master/item_brand`, {
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

  async getItemBrandDetail(id) {
    return await api({ requiresAuth: true })
      .get(`${process.env.VUE_APP_APIGATEWAY}/v1/master/item_brand/${id}`)
      .then((response:AxiosResponse) => {
        return Promise.resolve(response)
      })
  }

  async addItemBrand(data) {
    return await api({requiresAuth: true})
      .post(`${process.env.VUE_APP_APIGATEWAY}/v1/master/item_brand`, data)
      .then((response:AxiosResponse) => {
        const data:CoreResponse = response.data
        return data
      })
  }

  async editItemBrand(id, data) {
    return await api({requiresAuth: true})
      .patch(`${process.env.VUE_APP_APIGATEWAY}/v1/master/item_brand/${id}`, data)
      .then((response:AxiosResponse) => {
        const data:CoreResponse = response.data
        return data
      })
  }

  async deleteItemBrand(id) {
    return await api({ requiresAuth: true })
      .delete(`${process.env.VUE_APP_APIGATEWAY}/v1/master/item_brand/${id}`)
      .then((response: any) => {
        return Promise.resolve(response)
      })
  }
}

export default new MasterItemBrandService()
