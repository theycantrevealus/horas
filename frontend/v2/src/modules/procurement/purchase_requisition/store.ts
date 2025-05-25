import type { CoreResponse } from '@/interfaces/api'
import api from '@/utils/core/api'
import type { AxiosResponse } from 'axios'
import { defineStore } from 'pinia'
import type {
  ProcurementPurchaseRequisitionAdd,
  ProcurementPurchaseRequisitionApproval,
  ProcurementPurchaseRequisitionEdit,
} from './interfaces'

export const storeProcurementPurchaseRequisition = defineStore('procurementPurchaseRequisition', {
  actions: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async list(parameter: any) {
      return await api({ requiresAuth: true })
        .get(`${import.meta.env.VITE_PROCUREMENT_URL}/v1/procurement/purchase_requisition`, {
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
        .get(`${import.meta.env.VITE_PROCUREMENT_URL}/v1/procurement/purchase_requisition/${id}`)
        .then((response: AxiosResponse) => {
          const data: CoreResponse = response.data
          return data
        })
        .catch((e) => {
          throw e
        })
    },
    async add(parameter: ProcurementPurchaseRequisitionAdd) {
      return await api({ requiresAuth: true, responseToast: true })
        .post(
          `${import.meta.env.VITE_PROCUREMENT_URL}/v1/procurement/purchase_requisition`,
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
    async edit(id: string, parameter: ProcurementPurchaseRequisitionEdit) {
      return await api({ requiresAuth: true, responseToast: true })
        .patch(
          `${import.meta.env.VITE_PROCUREMENT_URL}/v1/procurement/purchase_requisition/${id}`,
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
        .delete(`${import.meta.env.VITE_PROCUREMENT_URL}/v1/procurement/purchase_requisition/${id}`)
        .then((response: AxiosResponse) => {
          const data: CoreResponse = response.data
          return data
        })
        .catch((e) => {
          throw e
        })
    },
    async askApproval(id: string, parameter: ProcurementPurchaseRequisitionApproval) {
      return await api({ requiresAuth: true, responseToast: true })
        .patch(
          `${import.meta.env.VITE_PROCUREMENT_URL}/v1/procurement/purchase_requisition/ask_approval/${id}`,
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
    async approve(id: string, parameter: ProcurementPurchaseRequisitionApproval) {
      return await api({ requiresAuth: true, responseToast: true })
        .patch(
          `${import.meta.env.VITE_PROCUREMENT_URL}/v1/procurement/purchase_requisition/approve/${id}`,
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
    async decline(id: string, parameter: ProcurementPurchaseRequisitionApproval) {
      return await api({ requiresAuth: true, responseToast: true })
        .patch(
          `${import.meta.env.VITE_PROCUREMENT_URL}/v1/procurement/purchase_requisition/decline/${id}`,
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
