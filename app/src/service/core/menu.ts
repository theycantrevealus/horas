import api from '@/util/api'
import * as process from "process";
import {CoreResponse} from "@/model/Response";

class CoreService {
  async menuSearch(parameter:any) {
    return await api({requiresAuth: true})
      .get(`${process.env.VUE_APP_APIGATEWAY}/v1/menu`, {
        params: {
          lazyEvent: JSON.stringify(parameter)
        }
      })
      .then((response) => {
        console.log(response)
        const data: CoreResponse = response.data
        return Promise.resolve(data)
      })
  }
  async menuAdd(menuData: any) {
    return await api({ requiresAuth: true })
      .post(`${process.env.VUE_APP_APIGATEWAY}/v1/menu`, menuData)
      .then((response) => {
        const data: CoreResponse = response.data
        return Promise.resolve(data)
      })
  }

  async menuPermissionAdd(menuData: any) {
    return await api({ requiresAuth: true })
      .post(`${process.env.VUE_APP_APIGATEWAY}/v1/menu_permission/add`, menuData)
      .then((response) => {
        const data: CoreResponse = response.data
        return Promise.resolve(data)
      })
  }

  async menuEdit(id: number, menuData: any) {
    return await api({ requiresAuth: true })
      .patch(`${process.env.VUE_APP_APIGATEWAY}/v1/menu/${id}`, menuData)
      .then((response) => {
        const data: CoreResponse = response.data
        return Promise.resolve(data)
      })
      .catch((e) => {
        return Promise.reject(e)
      })
  }

  async menuDelete(menuData: any) {
    return await api({ requiresAuth: true })
      .delete(`${process.env.VUE_APP_APIGATEWAY}/v1/menu/${menuData}`)
      .then((response) => {
        const data = response.data.payload.data
        return Promise.resolve(data)
      })
      .catch((e) => {
        //
      })
  }

  async menuDetail(id) {
    return await api({ requiresAuth: true })
      .get(`${process.env.VUE_APP_APIGATEWAY}/v1/menu/${id}`)
      .then((response) => {
        return Promise.resolve(response)
      })
  }

  async menuPermission() {
    return api({ requiresAuth: true })
      .get(`${process.env.VUE_APP_APIGATEWAY}/v1/Core/menu_permission`)
      .then((response) => {
        return Promise.resolve(response)
      })
  }

  async menuTreeEnd() {
    return await api({ requiresAuth: true })
      .get(`${process.env.VUE_APP_APIGATEWAY}/v1/Core/menu_manager_treeend`)
      .then((response) => {
        return Promise.resolve(response.data.response_package)
      })
  }
}

export default new CoreService()
