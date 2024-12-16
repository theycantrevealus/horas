import api from '@/util/api'
import {ISupplier} from "@/model/Supplier";
import {CoreResponse} from "@/model/Response";
import {AxiosResponse} from "axios";
import process from 'process'

class MasterQueueMachineService {
  getQueueMachineList(parsedData) {
    return api({ requiresAuth: true })
      .get(`${process.env.VUE_APP_APIGATEWAY}/v1/master/queue_machine`, {
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

  async getQueueMachineDetail(id) {
    return await api({ requiresAuth: true })
      .get(`${process.env.VUE_APP_APIGATEWAY}/v1/master/queue_machine/${id}`)
      .then((response:AxiosResponse) => {
        return Promise.resolve(response)
      })
  }

  async addQueueMachine(data) {
    return await api({requiresAuth: true})
      .post(`${process.env.VUE_APP_APIGATEWAY}/v1/master/queue_machine`, data)
      .then((response:AxiosResponse) => {
        const data:CoreResponse = response.data
        return data
      })
  }

  async editQueueMachine(id, data) {
    return await api({requiresAuth: true})
      .patch(`${process.env.VUE_APP_APIGATEWAY}/v1/master/queue_machine/${id}`, data)
      .then((response:AxiosResponse) => {
        const data:CoreResponse = response.data
        return data
      })
  }

  async deleteQueueMachine(id) {
    return await api({ requiresAuth: true })
      .delete(`${process.env.VUE_APP_APIGATEWAY}/v1/master/queue_machine/${id}`)
      .then((response: any) => {
        return Promise.resolve(response)
      })
  }
}

export default new MasterQueueMachineService()
