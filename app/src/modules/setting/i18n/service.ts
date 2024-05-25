import api from '@/util/api'
import process from 'process'
import {CoreResponse} from "@/model/Response";

class Corei18nService {
  async i18nList(parsedData) {
    return await api({ requiresAuth: true })
      .get(`${process.env.VUE_APP_APIGATEWAY}/v1/i18n?lazyEvent=${JSON.stringify(parsedData)}`)
      .then((response) => {
        return Promise.resolve(response)
      })
      .catch((e) => {
        //
      })
  }

  async i18nUpdate(parsedData) {
    return await api({ requiresAuth: true })
      .patch(
        `${process.env.VUE_APP_APIGATEWAY}/v1/i18n/${parsedData.id}`,
        parsedData
      )
      .then((response) => {
        const data: CoreResponse = response.data
        return Promise.resolve(data)
      })
      .catch((e) => {
        //
      })
  }

  async i18nAdd(parsedData) {
    return await api({ requiresAuth: true })
      .post(`${process.env.VUE_APP_APIGATEWAY}/v1/i18n/add`, parsedData)
      .then((response) => {
        const data: CoreResponse = response.data
        return Promise.resolve(data)
      })
      .catch((e) => {
        //
      })
  }

  async i18nDetail(id) {
    return await api({ requiresAuth: true })
      .get(`${process.env.VUE_APP_APIGATEWAY}/v1/i18n/${id}`)
      .then((response) => {
        const data: CoreResponse = response.data
        return Promise.resolve(data)
      })
      .catch((e) => {
        //
      })
  }

  async i18nDelete(id) {
    return await api({ requiresAuth: true })
      .delete(`${process.env.VUE_APP_APIGATEWAY}/v1/i18n/${id}/delete`)
      .then((response) => {
        const data: CoreResponse = response.data
        return Promise.resolve(data)
      })
      .catch((e) => {
        //
      })
  }
}

export default new Corei18nService()
