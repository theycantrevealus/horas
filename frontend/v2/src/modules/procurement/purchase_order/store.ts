import type { CoreResponse } from '@/interfaces/api'
import api from '@/utils/core/api'
import type { AxiosResponse } from 'axios'
import { defineStore } from 'pinia'
import type {
  ProcurementPurchaseOrderAdd,
  ProcurementPurchaseOrderApproval,
  ProcurementPurchaseOrderEdit,
} from './interfaces'

export const storeProcurementPurchaseOrder = defineStore('procurementPurchaseOrder', {
  actions: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async list(parameter: any) {
      return await api({ requiresAuth: true })
        .get(`${import.meta.env.VITE_PROCUREMENT_URL}/v1/procurement/purchase_order`, {
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
        .get(`${import.meta.env.VITE_PROCUREMENT_URL}/v1/procurement/purchase_order/${id}`)
        .then((response: AxiosResponse) => {
          const data: CoreResponse = response.data
          return data
        })
        .catch((e) => {
          throw e
        })
    },
    async add(parameter: ProcurementPurchaseOrderAdd) {
      return await api({ requiresAuth: true, responseToast: true })
        .post(`${import.meta.env.VITE_PROCUREMENT_URL}/v1/procurement/purchase_order`, parameter)
        .then((response: AxiosResponse) => {
          const data: CoreResponse = response.data
          return data
        })
        .catch((e) => {
          throw e
        })
    },
    async edit(id: string, parameter: ProcurementPurchaseOrderEdit) {
      return await api({ requiresAuth: true, responseToast: true })
        .patch(
          `${import.meta.env.VITE_PROCUREMENT_URL}/v1/procurement/purchase_order/${id}`,
          parameter,
        )
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
        .delete(`${import.meta.env.VITE_PROCUREMENT_URL}/v1/procurement/purchase_order/${id}`)
        .then((response: AxiosResponse) => {
          const data: CoreResponse = response.data
          return data
        })
        .catch((e) => {
          throw e
        })
    },
    async askApproval(id: string, parameter: ProcurementPurchaseOrderApproval) {
      return await api({ requiresAuth: true, responseToast: true })
        .patch(
          `${import.meta.env.VITE_PROCUREMENT_URL}/v1/procurement/purchase_order/ask_approval/${id}`,
          parameter,
        )
        .then((response: AxiosResponse) => {
          const data: CoreResponse = response.data
          return data
        })
        .catch((e) => {
          throw e
        })
    },
    async approve(id: string, parameter: ProcurementPurchaseOrderApproval) {
      return await api({ requiresAuth: true, responseToast: true })
        .patch(
          `${import.meta.env.VITE_PROCUREMENT_URL}/v1/procurement/purchase_order/approve/${id}`,
          parameter,
        )
        .then((response: AxiosResponse) => {
          const data: CoreResponse = response.data
          return data
        })
        .catch((e) => {
          throw e
        })
    },
    async decline(id: string, parameter: ProcurementPurchaseOrderApproval) {
      return await api({ requiresAuth: true, responseToast: true })
        .patch(
          `${import.meta.env.VITE_PROCUREMENT_URL}/v1/procurement/purchase_order/decline/${id}`,
          parameter,
        )
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
