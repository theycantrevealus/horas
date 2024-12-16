import api from '@/util/api'
import {ISupplier} from "@/model/Supplier";
import {CoreResponse} from "@/model/Response";
import {AxiosResponse} from "axios";
import process from 'process'

class MasterItemService {
  getItemList(parsedData) {
    return api({ requiresAuth: true })
      .get(`${process.env.VUE_APP_APIGATEWAY}/v1/master/item`, {
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

  async getItemDetail(id) {
    return await api({ requiresAuth: true })
      .get(`${process.env.VUE_APP_APIGATEWAY}/v1/master/item/${id}`)
      .then((response: any) => {
        return Promise.resolve(response)
      })
  }

  async findItem(search: string): Promise<ISupplier[]> {
    return await api({requiresAuth: true}).get(`${process.env.VUE_APP_APIGATEWAY}/v1/master/item`, {
      params: {
        lazyEvent: `{"first":0,"rows":10,"projection": {}, "sortField":"created_at","sortOrder":1,"filters":{"name":{"value":"${search}", "matchMode": "contains"}},"search_term": {}}`,
      }
    }).then((response: AxiosResponse) => {
      return Promise.resolve(response.data)
    })
  }

  // ====================================== MASTER SUPPLIER
  async findSupplier(search: string): Promise<ISupplier[]> {
    return await api({requiresAuth: true}).get(`${process.env.VUE_APP_APIGATEWAY}/v1/master/supplier`, {
      params: {
        lazyEvent: `{"first":0,"rows":10,"projection": {}, "sortField":"created_at","sortOrder":1,"filters":{"name":{"value":"${search}", "matchMode": "contains"}},"search_term": {}}`,
      }
    }).then((response: AxiosResponse) => {
      return Promise.resolve(response.data)
    })
  }
}

export default new MasterItemService()
