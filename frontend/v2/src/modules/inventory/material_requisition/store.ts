import type { CoreResponse } from '@/interfaces/api'
import api from '@/utils/core/api'
import type { AxiosResponse } from 'axios'
import { defineStore } from 'pinia'
import type {
  InventoryMaterialRequisitionAdd,
  InventoryMaterialRequisitionApproval,
  InventoryMaterialRequisitionEdit,
} from './interfaces'

export const storeInventoryMaterialRequisition = defineStore('inventoryMaterialRequisition', {
  actions: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async list(parameter: any) {
      // console.clear()
      // console.log(JSON.stringify(parameter, null, 2))

      return await api({ requiresAuth: true })
        .get(`${import.meta.env.VITE_INVENTORY_URL}/v1/inventory/material_requisition`, {
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
        .get(`${import.meta.env.VITE_INVENTORY_URL}/v1/inventory/material_requisition/${id}`)
        .then((response: AxiosResponse) => {
          const data: CoreResponse = response.data
          return data
        })
        .catch((e) => {
          throw e
        })
    },
    async add(parameter: InventoryMaterialRequisitionAdd) {
      return await api({ requiresAuth: true, responseToast: true })
        .post(`${import.meta.env.VITE_INVENTORY_URL}/v1/inventory/material_requisition`, parameter)
        .then((response: AxiosResponse) => {
          const data: CoreResponse = response.data
          return data
        })
        .catch((e) => {
          throw e
        })
    },
    async edit(id: string, parameter: InventoryMaterialRequisitionEdit) {
      return await api({ requiresAuth: true, responseToast: true })
        .patch(
          `${import.meta.env.VITE_INVENTORY_URL}/v1/inventory/material_requisition/${id}`,
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
        .delete(`${import.meta.env.VITE_INVENTORY_URL}/v1/inventory/material_requisition/${id}`)
        .then((response: AxiosResponse) => {
          const data: CoreResponse = response.data
          return data
        })
        .catch((e) => {
          throw e
        })
    },
    async askApproval(id: string, parameter: InventoryMaterialRequisitionApproval) {
      return await api({ requiresAuth: true, responseToast: true })
        .patch(
          `${import.meta.env.VITE_INVENTORY_URL}/v1/inventory/material_requisition/ask_approval/${id}`,
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
    async approve(id: string, parameter: InventoryMaterialRequisitionApproval) {
      return await api({ requiresAuth: true, responseToast: true })
        .patch(
          `${import.meta.env.VITE_INVENTORY_URL}/v1/inventory/material_requisition/approve/${id}`,
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
    async decline(id: string, parameter: InventoryMaterialRequisitionApproval) {
      return await api({ requiresAuth: true, responseToast: true })
        .patch(
          `${import.meta.env.VITE_INVENTORY_URL}/v1/inventory/material_requisition/decline/${id}`,
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
