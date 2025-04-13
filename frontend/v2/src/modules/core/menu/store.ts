import { defineStore } from 'pinia'
import api from '@/utils/core/api.ts'
import type { AxiosResponse } from 'axios'
import type { CoreResponse } from '@/interfaces/api.ts'
import type { MenuParameterAdd, MenuParameterEdit } from './interfaces'

export const storeMenu = defineStore('menu', {
  actions: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async list(parameter: any) {
      return await api({ requiresAuth: true })
        .get(`${import.meta.env.VITE_API_URL}/v1/menu`, {
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async tree(parameter: any) {
      return await api({ requiresAuth: true })
        .get(`${import.meta.env.VITE_API_URL}/v1/menu/tree/manager`, {
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
    // async find(term: string) {
    //   return await api({ requiresAuth: true })
    //     .get(`${import.meta.env.VITE_API_URL}/v1/lov?q=${term}`)
    //     .then((response: AxiosResponse) => {
    //       const data: CoreResponse = response.data
    //       return data
    //     })
    //     .catch((e) => {
    //       throw e
    //     })
    // },
    // async detail(id: string) {
    //   return await api({ requiresAuth: true })
    //     .get(`${import.meta.env.VITE_API_URL}/v1/lov/${id}`)
    //     .then((response: AxiosResponse) => {
    //       const data: CoreResponse = response.data
    //       return data
    //     })
    //     .catch((e) => {
    //       throw e
    //     })
    // },
    async edit(id: string, parameter: MenuParameterEdit) {
      return await api({ requiresAuth: true, responseToast: true })
        .patch(`${import.meta.env.VITE_API_URL}/v1/menu/${id}`, parameter)
        .then((response: AxiosResponse) => {
          const data: CoreResponse = response.data
          return data
        })
        .catch((e) => {
          throw e
        })
    },
    async add(parameter: MenuParameterAdd) {
      return await api({ requiresAuth: true, responseToast: true })
        .post(`${import.meta.env.VITE_API_URL}/v1/menu`, parameter)
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
        .delete(`${import.meta.env.VITE_API_URL}/v1/menu/${id}`)
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
