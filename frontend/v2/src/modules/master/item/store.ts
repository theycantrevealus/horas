import { defineStore } from 'pinia'
import api from '@/utils/core/api.ts'
import type { AxiosResponse } from 'axios'
import type { CoreResponse } from '@/interfaces/api.ts'
import type { MasterItemAdd, MasterItemEdit } from './interfaces'

export const storeMasterItem = defineStore('masterItem', {
  actions: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async list(parameter: any) {
      return await api({ requiresAuth: true })
        .get(`${import.meta.env.VITE_API_URL}/v1/master/item`, {
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
    async detail(id: string) {
      return await api({ requiresAuth: true })
        .get(`${import.meta.env.VITE_API_URL}/v1/master/item/${id}`)
        .then((response: AxiosResponse) => {
          const data: CoreResponse = response.data
          return data
        })
        .catch((e) => {
          throw e
        })
    },
    async edit(id: string, parameter: MasterItemEdit) {
      return await api({ requiresAuth: true, responseToast: true })
        .patch(`${import.meta.env.VITE_API_URL}/v1/master/item/${id}`, parameter)
        .then((response: AxiosResponse) => {
          const data: CoreResponse = response.data
          return data
        })
        .catch((e) => {
          throw e
        })
    },
    async add(parameter: MasterItemAdd) {
      return await api({ requiresAuth: true, responseToast: true })
        .post(`${import.meta.env.VITE_API_URL}/v1/master/item`, parameter)
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
        .delete(`${import.meta.env.VITE_API_URL}/v1/master/item/${id}`)
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
