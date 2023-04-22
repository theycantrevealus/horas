import api from '@/util/api'
import {ISupplier} from "@/model/Supplier";
import {CoreResponse} from "@/model/Response";
import {AxiosResponse} from "axios";

class MasterItemService {
  getItemList(parsedData) {
    return api({ requiresAuth: true })
      .get(`${process.env.VUE_APP_APIGATEWAY}v1/master/item`, {
        params: {
          lazyEvent: JSON.stringify(parsedData)
        },
      })
      .then((response: any) => {
        return Promise.resolve(response)
      })
  }

  async getItemDetail(id) {
    return await api({ requiresAuth: true })
      .get(`${process.env.VUE_APP_APIGATEWAY}v1/master/item/${id}`)
      .then((response: any) => {
        return Promise.resolve(response)
      })
  }

  async findItem(search: string): Promise<ISupplier[]> {
    return await api({requiresAuth: true}).get(`${process.env.VUE_APP_APIGATEWAY}v1/master/item/find`, {
      params: {
        limit: 20,
        search: search,
      }
    }).then((response: AxiosResponse) => {
      return response.data
    })
  }

  // ====================================== MASTER SUPPLIER
  async findSupplier(search: string): Promise<ISupplier[]> {
    return await api({requiresAuth: true}).get(`${process.env.VUE_APP_APIGATEWAY}v1/master/supplier/find`, {
      params: {
        limit: 10,
        search: search,
      }
    }).then((response: AxiosResponse) => {
      return response.data
    })
  }
}

export default new MasterItemService()
