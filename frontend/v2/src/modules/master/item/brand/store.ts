import { defineStore } from 'pinia'
import api from '@/utils/core/api.ts'
import type { AxiosResponse } from 'axios'
import type { CoreResponse } from '@/interfaces/api.ts'
import type { MasterItemBrandAddParameter, MasterItemBrandEditParameter } from './interfaces'

export const storeMasterItemBrand = defineStore('masterItemBrand', {
  actions: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async list(parameter: any) {
      return await api({ requiresAuth: true })
        .get(`${import.meta.env.VITE_API_URL}/v1/master/item_brand`, {
          params: {
            lazyEvent: JSON.stringify(parameter),
          },
        })
        .then((response: AxiosResponse) => {
          const data: CoreResponse = response.data
          return data
        })
        .catch((e) => {
          throw e
        })
    },
    async find(term: string) {
      return await api({ requiresAuth: true })
        .get(`${import.meta.env.VITE_API_URL}/v1/master/item_brand?q=${term}`)
        .then((response: AxiosResponse) => {
          const data: CoreResponse = response.data
          return data
        })
        .catch((e) => {
          throw e
        })
    },
    async detail(id: string) {
      return await api({ requiresAuth: true })
        .get(`${import.meta.env.VITE_API_URL}/v1/master/item_brand/${id}`)
        .then((response: AxiosResponse) => {
          const data: CoreResponse = response.data
          return data
        })
        .catch((e) => {
          throw e
        })
    },
    async edit(id: string, parameter: MasterItemBrandEditParameter) {
      return await api({ requiresAuth: true, responseToast: true })
        .put(`${import.meta.env.VITE_API_URL}/v1/master/item_brand/${id}`, parameter)
        .then((response: AxiosResponse) => {
          const data: CoreResponse = response.data
          return data
        })
        .catch((e) => {
          throw e
        })
    },
    async add(parameter: MasterItemBrandAddParameter) {
      return await api({ requiresAuth: true, responseToast: true })
        .post(`${import.meta.env.VITE_API_URL}/v1/master/item_brand`, parameter)
        .then((response: AxiosResponse) => {
          const data: CoreResponse = response.data
          return data
        })
        .catch((e) => {
          throw e
        })
    },
    async delete(id: string) {
      return await api({ requiresAuth: true, responseToast: true })
        .delete(`${import.meta.env.VITE_API_URL}/v1/master/item_brand/${id}`)
        .then((response: AxiosResponse) => {
          const data: CoreResponse = response.data
          return data
        })
        .catch((e) => {
          throw e
        })
    },
  },
})
