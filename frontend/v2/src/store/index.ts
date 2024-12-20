import { createPinia, defineStore } from 'pinia'
import type { ToastMessageOptions } from 'primevue/toast'
import SecureLS from 'secure-ls'
interface Permission {
  url: string
  name: string
}

interface Authentication {
  token: string
  id: string
  code: string
  first_name: string
  last_name: string
  permission: Permission[]
}

interface Setting {
  theme: string
  dark: boolean
}

interface ToastMessageOptionsExtra extends ToastMessageOptions{
  position?: string
}

interface StateCore {
  auth: Authentication
  setting: Setting
  toast: ToastMessageOptionsExtra
}

const ls = new SecureLS({ isCompression: false })

export const storeCore = defineStore('core',{
  state: ():StateCore => ({
    auth: {
      token: '',
      id: '',
      code: '',
      first_name: '',
      last_name: '',
      permission: [],
    },
    setting: {
      theme: '',
      dark: false
    },
    toast: {
      severity: 'warn',
      summary: 'Menu Manager',
      detail: 'Hello',
      life: 3000,
    }
  }),
  persist: {
    storage: {
      getItem: (key) => ls.get(key),
      setItem: (key, value) => ls.set(key, value),
    }
  },
  getters: {
    getToken(state): string {
      return state.auth.token
    }
  },
  actions: {
    signOut() {
      this.$reset()
    },
    async setToast(payload:ToastMessageOptionsExtra) {
      this.toast = {
        severity: 'warn',
        summary: 'Menu Manager',
        detail: 'Hello',
        life: 3000,
      }
    },
    hasAccess(name: string):boolean {
      if(this.auth.permission?.length > 0) {
        const found = this.auth.permission.find((o, i) => {
          if (o.name === name) {
            return true;
          }
        })
         return !!(found)
      } else {
        return false
      }
    }
  }
})
