import axios, {AxiosResponse} from 'axios'
import store from '@/store'
import api from "@/util/api";
import process from 'process'
import {CoreResponse} from "@/model/Response";
class AccountService {
  async getAccountList(parsedData) {
    return api({ requiresAuth: true })
      .get(`${process.env.VUE_APP_APIGATEWAY}/v1/account`, {
        params: {
          lazyEvent: parsedData
        },
      })
      .then(async (response: AxiosResponse) => {
        const data: CoreResponse = response.data
        return Promise.resolve(data)
      })
      .catch((e: Error) => {
        return Promise.reject(e)
      })
  }

  async updatePermission(parsedData) {
    return api({requiresAuth: true})
      .post(
        `${process.env.VUE_APP_APIGATEWAY}/v1/account/grant_permission`,
        parsedData
      )
      .then(async (response: any) => {
        return await Promise.resolve(response)
      })
  }

  async updateAccess(parsedData) {
    return api({requiresAuth: true})
      .post(
        `${process.env.VUE_APP_APIGATEWAY}/v1/account/grant_access`,
        parsedData
      )
      .then(async (response: any) => {
        return await Promise.resolve(response)
      })
  }

  async updateAccount(parsedData) {
    return api({requiresAuth: true})
      .patch(
        `${process.env.VUE_APP_APIGATEWAY}/v1/account/${parsedData.id}`,
        {
          code: parsedData.code,
          phone: parsedData.phone,
          email: parsedData.email,
          first_name: parsedData.first_name,
          last_name: parsedData.last_name,
          permission: parsedData.selectedPermission,
          access: parsedData.selectedAccess,
          __v: parsedData.__v,
        }
      )
      .then(async (response: any) => {
        const data: CoreResponse = response.data
        return Promise.resolve(data)
      })
      .catch((e: Error) => {
        return Promise.reject(e)
      })
  }

  async getAccountDetail(id) {
    return api({requiresAuth: true})
      .get(`${process.env.VUE_APP_APIGATEWAY}/v1/account/${id}`)
      .then(async (response: any) => {
        const data: CoreResponse = response.data
        return Promise.resolve(data)
      })
  }

  async getAccountActivity(id: number, from: string, to: string) {
    return []
  }

  async getMenu() {
    return api({requiresAuth: true})
      .get(`${process.env.VUE_APP_APIGATEWAY}/v1/menu`)
      .then(async (response) => {
        return await Promise.resolve(response)
      })
  }

  async getAuthorityList() {
    return api({requiresAuth: true})
      .get(`${process.env.VUE_APP_APIGATEWAY}/v1/authority`)
      .then(async (response) => {
        return await Promise.resolve(response)
      })
  }

  async menuTree() {
    return api({requiresAuth: true})
      .get(`${process.env.VUE_APP_APIGATEWAY}/v1/menu/tree/manager`)
      .then(async (response) => {
        return await Promise.resolve(response)
      })
  }

  async menuList() {
    return api({requiresAuth: true})
      .get(`${process.env.VUE_APP_APIGATEWAY}/v1/menu?lazyEvent={"first":0,"rows":200,"sortField":"created_at","sortOrder":1,"filters":{}}`)
      .then(async (response) => {
        return await Promise.resolve(response)
      })
  }
}

export default new AccountService()
