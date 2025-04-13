import { defineStore } from 'pinia'
import { storeCore } from '@/store'
import api from '@/utils/core/api.ts'
import { CoreResponseLib } from '@/interfaces/api.js'

export const storeLogin = defineStore('signIn', () => {
  const parentStore = storeCore()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function signIn(payload: any) {
    api({ requiresAuth: false })
      .post(`${import.meta.env.VITE_API_URL}/v1/account/signin`, payload)
      .then(async (response) => {
        const data = response.data

        if (
          `${data.statusCode['classCode']}_I_${data.statusCode['customCode']}` ===
          CoreResponseLib.Login.success
        ) {
          parentStore.auth.token = data.payload.token
          parentStore.auth.id = data.payload.account.id
          parentStore.auth.code = data.payload.account.code
          parentStore.auth.first_name = data.payload.account.first_name
          parentStore.auth.last_name = data.payload.account.last_name
          parentStore.auth.permission = data.payload.account.permission
          parentStore.updatePermissionv2(data.payload.account.menu)
          parentStore.updateAppConfig(data.payload.config)
          // parentStore.updateAccess(data.payload.account)
          // parentStore.updatePermission(data.payload.account)
        }
      })
      .catch((e: Error) => {
        console.error(`Error ${e}`)
      })
  }

  parentStore.$subscribe(
    (mutation, state) => {
      if (state.auth.token !== '') {
        //
      }
    },
    { flush: 'sync' },
  )

  return { signIn }
})
