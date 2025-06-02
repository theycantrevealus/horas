import { defineStore } from 'pinia'
import api from '@/utils/core/api.ts'
import type { AxiosResponse } from 'axios'
import type { CoreResponse } from '@/interfaces/api.ts'
import type { i18nAdd, i18nEdit } from './interfaces'

export const storei18n = defineStore('i18n', {
  actions: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async list(parameter: any) {
      return await api({ requiresAuth: true })
        .get(`${import.meta.env.VITE_API_URL}/v1/i18n`, {
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
    async detail(id: string): Promise<CoreResponse> {
      return await api({ requiresAuth: true })
        .get(`${import.meta.env.VITE_API_URL}/v1/i18n/${id}`)
        .then((response: AxiosResponse) => response.data)
        .catch((e) => {
          throw e
        })
    },
    async edit(id: string, parameter: i18nEdit) {
      return await api({ requiresAuth: true, responseToast: true })
        .patch(`${import.meta.env.VITE_API_URL}/v1/i18n/${id}`, parameter)
        .then((response: AxiosResponse) => {
          const data: CoreResponse = response.data
          return data
        })
        .catch((e) => {
          throw e
        })
    },
    async add(parameter: i18nAdd) {
      return await api({ requiresAuth: true, responseToast: true })
        .post(`${import.meta.env.VITE_API_URL}/v1/i18n`, parameter)
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
        .delete(`${import.meta.env.VITE_API_URL}/v1/i18n/${id}`)
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
