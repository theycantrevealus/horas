import { defineStore } from 'pinia'
import { storeCore } from '@/store'
import { useRouter } from 'vue-router'
import api from '@/utils/core/api.ts'
import { CoreResponseLib } from '@/interfaces/api.js'

export const storeLogin = defineStore('signIn', () => {
  const parentStore = storeCore()
  const router = useRouter()

  function signIn(payload: any) {
    api({ requiresAuth: false })
      .post(`${import.meta.env.VITE_API_URL}/v1/account/signin`, payload)
      .then(async (response) => {
        const data = response.data

        console.log(data)

        if (`${data.statusCode['classCode']}_I_${data.statusCode['customCode']}` === CoreResponseLib.Login.success) {
          parentStore.auth.token = data.payload.token
          parentStore.auth.id = data.payload.account.id
          parentStore.auth.code = data.payload.account.code
          parentStore.auth.first_name = data.payload.account.first_name
          parentStore.auth.last_name = data.payload.account.last_name
          parentStore.auth.permission = data.payload.account.permission



        }
      })
      .catch((e: Error) => {
        alert(`Error ${e}`);
      })
  }

  parentStore.$subscribe((mutation, state) => {
    if(state.auth.token !== '') {
      router.push('/')
    }
  })

  return { signIn }
})
