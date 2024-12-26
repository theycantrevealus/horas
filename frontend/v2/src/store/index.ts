import { createPinia, defineStore } from 'pinia'
import type { ToastMessageOptions } from 'primevue/toast'
import SecureLS from 'secure-ls'
import api from '@/utils/core/api'
import getBrowserLocale from "@/utils/core/i18n.ts";

interface AccountAccessItem {
  domIdentity: string
  dispatchName: string
}

interface AccountAccess {
  id: string
  name: string
  url: string
  identifier: string
  access: AccountAccessItem[]
}

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
  permission: Permission[] // TODO : Consider to take out
  pagesAllow: any
  domAllow: AccountAccessItem[]
}

interface Setting {
  theme: string
  dark: boolean
  sidePanel: boolean
  language: any
  languageLib: any
  languageMeta?: any
  routeMap?: any // TODO : Analyze usage
  routes?: any[] // TODO : Analyze usage
  pages?: any[] // TODO : Analyze usage
  menu?: any[] // TODO : Analyze usage
}

interface ToastMessageOptionsExtra extends ToastMessageOptions{
  position?: string
}

interface UIStatus {
  isEditData: boolean
}

interface StateCore {
  auth: Authentication
  setting: Setting
  ui_status: UIStatus
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
      pagesAllow: {},
      domAllow: []
    },
    ui_status: {
      isEditData: false
    },
    setting: {
      theme: '',
      dark: false,
      sidePanel: false,
      language: {},
      languageLib: {},
      languageMeta: {
        en: {
          code: 'us',
          lang: 'en',
          name: 'United States',
          currency: 'USD',
        },
        id: {
          code: 'id',
          lang: 'id',
          name: 'Indonesia',
          currency: 'IDR',
        },
      },
      routeMap: {},
      routes: [],
      pages: [],
      menu: []
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
    },
    getSidePanel(state): boolean {
      return state.setting.sidePanel
    },




    // UI STATUS MANAGEMENT
    UIEdittingStatus(state): boolean {
      return state.ui_status.isEditData
    }
  },
  actions: {
    async signOut() {
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
      return this.auth.pagesAllow.hasOwnProperty(name)
    },
    allowDispatch(domIdentity: string) {
      return this.auth.domAllow.find((o: AccountAccessItem, i: number) => {
        return (o.domIdentity === domIdentity)
      })
    },
    updatePermissionv2(access: AccountAccess[]) {
      const pagesAccess:any = {}
      const domAccess:any = []

      for (let pagesKey in access) {
        if(! pagesAccess[access[pagesKey].name]) {
          pagesAccess[access[pagesKey].name] = {}
        }

        pagesAccess[access[pagesKey].name] = access[pagesKey]

        if(access[pagesKey].access && access[pagesKey].access.length > 0) {
          const accessList = access[pagesKey].access

          for(let accessKey in accessList) {
            const check = domAccess.find((o: AccountAccessItem, i: number) => {
              return (o.domIdentity === accessList[accessKey].domIdentity)
            });

            if(!check) {
              domAccess.push(accessList[accessKey])
            }
          }
        }
      }

      this.auth.pagesAllow = pagesAccess
      this.auth.domAllow = domAccess
      // this.auth.token = ''
    },
    updatePermission(payload:any) {
      const routeMap:any = {}
      const grantedPerm = payload.permission
      const buildPermission:any = {}
      for (let a in grantedPerm) {
        if (buildPermission[grantedPerm[a].domIdentity]) {
          buildPermission[grantedPerm[a].domIdentity] = {}
        }
        buildPermission[grantedPerm[a].domIdentity] = grantedPerm[a]

        if(grantedPerm[a]?.menu) {
          if(!routeMap[grantedPerm[a].menu.identifier]) {
            routeMap[grantedPerm[a].menu.identifier] = {}
          }

          if(!routeMap[grantedPerm[a].menu.identifier].permission) {
            routeMap[grantedPerm[a].menu.identifier].permission = []
          }

          if(routeMap[grantedPerm[a].menu.identifier].permission.indexOf(grantedPerm[a].dispatchName) < 0) {
            routeMap[grantedPerm[a].menu.identifier].permission.push(grantedPerm[a].dispatchName)
          }
        }

        if(!routeMap[grantedPerm[a].dispatchName]) {
          routeMap[grantedPerm[a].dispatchName] = {}
        }
      }
      this.auth.permission = buildPermission
      this.setting.routeMap = routeMap
    },
    updateAccess(payload: any) {
      const routes: string[] = ['Login']
      const routeMap:any = {}
      const grantedPage = payload.access
      const buildPage:any = {}

      for (let a in grantedPage) {
        if(grantedPage[a]) {
          if (buildPage[`page_${grantedPage[a].id}`]) {
            buildPage[`page_${grantedPage[a].id}`] = {}
          }
          buildPage[`page_${grantedPage[a].id}`] = grantedPage[a]
          if(routes.indexOf(grantedPage[a].identifier) < 0) routes.push(grantedPage[a].identifier)
          if(grantedPage[a].identifier !== '') {
            if(!routeMap[grantedPage[a].identifier]) {
              routeMap[grantedPage[a].identifier] = {}
            }
            routeMap[grantedPage[a].identifier] = grantedPage[a]
          }
        }
      }

      this.setting.pages = buildPage
      this.setting.routes = routes
    },
    async getLanguage() {
      await api({ requiresAuth: true })
        .get(`${import.meta.env.VITE_API_URL}/v1/i18n/all`)
        .then((response) => {
          const data = response.data
          return Promise.resolve(data)
        })
        .catch((e) => {
          return Promise.reject(e)
        })
    },
    changeLanguage(payload: any) {
      this.setting.language = payload
    },
    toggleDarkMode() {
      this.setting.dark = !this.setting.dark
    },
    toggleSideMenuOn() {
      this.setting.sidePanel = true
    },
    toggleSideMenuOff() {
      this.setting.sidePanel = false
    },
    async generateMenu() {
      await api({ requiresAuth: true })
        .get(`${import.meta.env.VITE_API_URL}/v1/menu/tree`)
        .then((response) => {
          this.setting.menu = response.data
        })
    },
    setBrowserLanguage(data: any) {
      if(this.setting.language && Object.keys(this.setting.language).length === 0 && Object.getPrototypeOf(this.setting.language) === Object.prototype) {
        const selectedLanguage: string = getBrowserLocale({
          countryCodeOnly: data,
        })

        this.setting.language = this.setting.languageMeta[selectedLanguage]
      }
    },
    // UI STATUS MANAGEMENT
    async UIToggleEditingData(status: boolean) {
      this.ui_status.isEditData = status
    }
  }
})
