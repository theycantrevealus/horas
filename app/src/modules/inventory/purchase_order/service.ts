import api from '@/util/api'
import {AxiosResponse} from "axios";
import {CoreResponse} from "@/model/Response";

class PurchaseOrderService {
  getItemList(parsedData) {
    return api({ requiresAuth: true })
      .get(`${process.env.VUE_APP_APIGATEWAY}v1/inventory/purchase_order`, {
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
      .get(`${process.env.VUE_APP_APIGATEWAY}v1/inventory/purchase_order/${id}`)
      .then((response: any) => {
        return Promise.resolve(response)
      })
  }

  async addPurchaseOrder(data): Promise<CoreResponse> {
    return await api({requiresAuth: true})
      .post(`${process.env.VUE_APP_APIGATEWAY}v1/inventory/purchase_order`,data)
      .then((response:AxiosResponse) => {
        const data:CoreResponse = response.data
        return data
      })
  }
}

export default new PurchaseOrderService()
