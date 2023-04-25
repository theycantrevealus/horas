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

  async getPurchaseOrderDetail(id) {
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

  async editPurchaseOrder(id, data): Promise<CoreResponse> {
    return await api({requiresAuth: true})
      .patch(`${process.env.VUE_APP_APIGATEWAY}v1/inventory/purchase_order/${id}`,data)
      .then((response:AxiosResponse) => {
        const data:CoreResponse = response.data
        return data
      })
  }

  async askApproval(data): Promise<CoreResponse> {
    return await api({requiresAuth: true})
      .patch(`${process.env.VUE_APP_APIGATEWAY}v1/inventory/purchase_order/ask_approval/${data.id}`, {
        status: 'need_approval',
        remark: data.remark,
        __v: data.__v
      })
      .then((response:AxiosResponse) => {
        const data:CoreResponse = response.data
        return data
      })
  }

  async approveApproval(data): Promise<CoreResponse> {
    return await api({requiresAuth: true})
      .patch(`${process.env.VUE_APP_APIGATEWAY}v1/inventory/purchase_order/approve/${data.id}`, {
        status: 'approved',
        remark: data.remark,
        __v: data.__v
      })
      .then((response:AxiosResponse) => {
        const data:CoreResponse = response.data
        return data
      })
  }

  async declineApproval(data): Promise<CoreResponse> {
    return await api({requiresAuth: true})
      .patch(`${process.env.VUE_APP_APIGATEWAY}v1/inventory/purchase_order/decline/${data.id}`, {
        status: 'declined',
        remark: data.remark,
        __v: data.__v
      })
      .then((response:AxiosResponse) => {
        const data:CoreResponse = response.data
        return data
      })
  }

  async deletePurchaseOrder(data): Promise<CoreResponse> {
    return await api({requiresAuth: true}).delete(`${process.env.VUE_APP_APIGATEWAY}v1/inventory/purchase_order/${data.id}`).then((response: AxiosResponse) => {
      const data:CoreResponse = response.data
      return data
    })
  }
}

export default new PurchaseOrderService()
