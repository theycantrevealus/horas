import { defineStore } from 'pinia'
import api from '@/utils/core/api.ts'
import type { AxiosResponse } from 'axios'
import type { CoreResponse } from '@/interfaces/api.ts'

export const storeLOV = defineStore('lov', {
  actions: {
    async getList(parameter: any) {
      return await api({ requiresAuth: true })
        .get(`${import.meta.env.VITE_API_URL}/v1/lov`, {
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
    async findLOV(term: string) {
      return await api({ requiresAuth: true })
        .get(`${import.meta.env.VITE_API_URL}/v1/lov?q=${term}`)
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
