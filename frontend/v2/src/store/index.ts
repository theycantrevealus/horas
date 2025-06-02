import { defineStore } from 'pinia'
import type { ToastMessageOptions } from 'primevue/toast'
import SecureLS from 'secure-ls'
import api from '@/utils/core/api'
import type { Language } from '@/interfaces/language'
import { getBrowserLocale, i18n } from '@/utils/core/i18n'

interface AccountAccessItem {
  domIdentity: string
  dispatchName: string
}

export interface AccountAccess {
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pagesAllow: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  stock_point: any[]
  domAllow: AccountAccessItem[]
}

interface Setting {
  theme: string
  dark: boolean
  name: string
  __v: number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  logo: any
  sidePanel: boolean
  language: Language
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  languageLib: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  languageMeta?: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  routeMap?: any // TODO : Analyze usage
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  routes?: any[] // TODO : Analyze usage
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pages?: any[] // TODO : Analyze usage
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  menu?: any[] // TODO : Analyze usage
}

export interface ToastMessageOptionsExtra extends ToastMessageOptions {
  position?: string
}

interface UIStatus {
  isEditData: boolean
}

export interface StateCore {
  auth: Authentication
  setting: Setting
  ui_status: UIStatus
  toast: ToastMessageOptionsExtra
}

const ls = new SecureLS({ isCompression: false })

export const storeCore = defineStore('core', {
  state: (): StateCore => ({
    auth: {
      token: '',
      id: '',
      code: '',
      first_name: '',
      last_name: '',
      permission: [],
      pagesAllow: {},
      domAllow: [],
      stock_point: [],
    },
    ui_status: {
      isEditData: false,
    },
    setting: {
      theme: '',
      dark: false,
      name: '',
      __v: 0,
      logo: {
        light: {
          image: {
            target: '',
            size: {
              sidepanel: {
                width: '',
                height: '',
              },
            },
          },
          icon: {
            target: '',
            size: {
              sidepanel: {
                width: '',
                height: '',
              },
            },
          },
        },
        dark: {
          image: {
            target: '',
            size: {
              sidepanel: {
                width: '',
                height: '',
              },
            },
          },
          icon: {
            target: '',
            size: {
              sidepanel: {
                width: '',
                height: '',
              },
            },
          },
        },
      },
      sidePanel: false,
      language: {
        code: '',
        name: '',
        lang: '',
      },
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
      menu: [],
    },
    toast: {
      severity: 'warn',
      summary: 'Menu Manager',
      detail: '',
      life: 3000,
    },
  }),
  persist: {
    storage: {
      getItem: (key) => ls.get(key),
      setItem: (key, value) => ls.set(key, value),
    },
  },
  getters: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getAccount(state): any {
      return state.auth
    },
    getToken(state): string {
      return state.auth.token
    },
    getSidePanel(state): boolean {
      return state.setting.sidePanel
    },

    // UI STATUS MANAGEMENT
    UIEdittingStatus(state): boolean {
      return state.ui_status.isEditData
    },
  },
  actions: {
    async fetch_i18n() {
      return await api({ requiresAuth: true })
        .get(
          `${import.meta.env.VITE_API_URL}/v1/i18n?lazyEvent={"first":0,"rows":10,"sortField":"created_at","sortOrder":1,"filters":{}}`,
        )
        .then((response) => {
          const data = response.data.payload.data
          return Promise.resolve(data)
        })
        .catch((e) => {
          return Promise.reject(e)
        })
    },
    async signOut() {
      this.$reset()
    },
    async setToast(payload: ToastMessageOptionsExtra) {
      this.toast = {
        severity: 'warn',
        summary: 'Menu Manager',
        detail: 'Hello',
        life: 3000,
        ...payload,
      }
    },
    hasAccess(name: string): boolean {
      const dispatcher = this.auth.domAllow
      const dispatchFound = dispatcher.find(
        (foundedDispatch) => foundedDispatch.dispatchName === name,
      )
      const pageFound = name in this.auth.pagesAllow
      return pageFound || dispatchFound !== undefined
      // return this.auth.pagesAllow.hasOwnProperty(name)
    },
    allowDispatch(domIdentity: string): boolean {
      let allowed = false
      if (
        this.auth.domAllow.find((o: AccountAccessItem) => {
          return o.domIdentity === domIdentity
        })
      ) {
        allowed = true
      }
      return allowed
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    updateAppConfig(data: any) {
      this.setting.logo.light.image = data.APPLICATION_LOGO?.setter
      this.setting.logo.light.image.target = `${data.APPLICATION_LOGO?.image}`

      this.setting.logo.light.icon = data.APPLICATION_ICON?.setter
      this.setting.logo.light.icon.target = `${data.APPLICATION_ICON?.image}`

      this.setting.logo.dark.image = data.APPLICATION_LOGO?.setter
      this.setting.logo.dark.image.target = `${data.APPLICATION_LOGO?.image}`

      this.setting.logo.dark.icon = data.APPLICATION_ICON?.setter
      this.setting.logo.dark.icon.target = `${data.APPLICATION_ICON?.image}`

      this.setting.name = data.APPLICATION_NAME?.setter
      this.setting.__v = data.APPLICATION_NAME?.__v

      // this.setting.logo.light.icon = data.application_icon?.setter
      // this.setting.logo.light.icon.target = `${import.meta.env.VITE_API_URL}/${data.application_icon?.setter.target}`
      // this.setting.logo.light.icon.target = `${data.APPLICATION_ICON?.image}`

      // this.setting.logo.dark.image = data.APPLICATION_LOGO?.setter
      // this.setting.logo.dark.image.target = `${import.meta.env.VITE_API_URL}/${data.APPLICATION_LOGO?.setter.image}`
      // this.setting.logo.dark.image.target = `${data.APPLICATION_LOGO?.image}`

      // this.setting.logo.dark.icon = data.application_icon?.setter
      // this.setting.logo.dark.icon.target = `${import.meta.env.VITE_API_URL}/${data.application_icon.setter?.target}`
    },
    updatePermissionv2(access: AccountAccess[]) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pagesAccess: any = {}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const domAccess: any = []

      for (const pagesKey in access) {
        if (!pagesAccess[access[pagesKey].identifier]) {
          pagesAccess[access[pagesKey].identifier] = {}
        }

        pagesAccess[access[pagesKey].identifier] = access[pagesKey]

        if (access[pagesKey].access && access[pagesKey].access.length > 0) {
          const accessList = access[pagesKey].access

          for (const accessKey in accessList) {
            const check = domAccess.find((o: AccountAccessItem) => {
              return o.domIdentity === accessList[accessKey].domIdentity
            })

            if (!check) {
              domAccess.push(accessList[accessKey])
            }
          }
        }
      }

      this.auth.pagesAllow = pagesAccess
      this.auth.domAllow = domAccess
      // this.auth.token = ''
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    updatePermission(payload: any) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const routeMap: any = {}
      const grantedPerm = payload.permission
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const buildPermission: any = {}
      for (const a in grantedPerm) {
        if (buildPermission[grantedPerm[a].domIdentity]) {
          buildPermission[grantedPerm[a].domIdentity] = {}
        }
        buildPermission[grantedPerm[a].domIdentity] = grantedPerm[a]

        if (grantedPerm[a]?.menu) {
          if (!routeMap[grantedPerm[a].menu.identifier]) {
            routeMap[grantedPerm[a].menu.identifier] = {}
          }

          if (!routeMap[grantedPerm[a].menu.identifier].permission) {
            routeMap[grantedPerm[a].menu.identifier].permission = []
          }

          if (
            routeMap[grantedPerm[a].menu.identifier].permission.indexOf(
              grantedPerm[a].dispatchName,
            ) < 0
          ) {
            routeMap[grantedPerm[a].menu.identifier].permission.push(grantedPerm[a].dispatchName)
          }
        }

        if (!routeMap[grantedPerm[a].dispatchName]) {
          routeMap[grantedPerm[a].dispatchName] = {}
        }
      }
      this.auth.permission = buildPermission
      this.setting.routeMap = routeMap
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    updateAccess(payload: any) {
      const routes: string[] = ['Login']
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const routeMap: any = {}
      const grantedPage = payload.access
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const buildPage: any = {}

      for (const a in grantedPage) {
        if (grantedPage[a]) {
          if (buildPage[`page_${grantedPage[a].id}`]) {
            buildPage[`page_${grantedPage[a].id}`] = {}
          }
          buildPage[`page_${grantedPage[a].id}`] = grantedPage[a]
          if (routes.indexOf(grantedPage[a].identifier) < 0) routes.push(grantedPage[a].identifier)
          if (grantedPage[a].identifier !== '') {
            if (!routeMap[grantedPage[a].identifier]) {
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
        .get(`${import.meta.env.VITE_API_URL}/v1/i18n`)
        .then((response) => {
          const data = response.data
          return Promise.resolve(data)
        })
        .catch((e) => {
          return Promise.reject(e)
        })
    },
    async changeLanguage(payload: Language) {
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async setBrowserLanguage(data: any) {
      // Fetch language from server
      const language_data = await this.fetch_i18n()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const i18nConfig: any = {
        messages: {},
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const allLanguage: any = {}
      if (language_data.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        language_data.forEach((item: any) => {
          const code = `${item.language_code.toLowerCase()}-${item.iso_2_digits.toUpperCase()}`

          if (!i18nConfig[code]) {
            i18nConfig[code] = {
              ...item.datetime,
              ...item.number,
            }
          }

          if (!allLanguage[item.language_code.toLowerCase()]) {
            allLanguage[item.language_code.toLowerCase()] = {}
          }

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          item.components.forEach((element: any) => {
            const keys = element.component.split('.')

            // let temp = i18nConfig[code].messages
            let temp = allLanguage[item.language_code.toLowerCase()]

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            keys.forEach((key: any, index: any) => {
              if (!temp[key]) {
                temp[key] = {}
              }

              if (index === keys.length - 1) {
                temp[key] = element.translation
              }

              temp = temp[key]
            })
          })
        })

        i18nConfig.messages = allLanguage
        Object.keys(allLanguage).forEach((locale: string) => {
          i18n.global.setLocaleMessage(locale, allLanguage[locale])
        })
      }

      if (
        this.setting.language &&
        // Object.keys(this.setting.language).length === 0 &&
        Object.getPrototypeOf(this.setting.language) === Object.prototype
      ) {
        const selectedLanguage: string = getBrowserLocale({
          countryCodeOnly: data,
        })

        this.setting.language = this.setting.languageMeta[selectedLanguage]
      }
    },
    // UI STATUS MANAGEMENT
    async UIToggleEditingData(status: boolean) {
      this.ui_status.isEditData = status
    },
  },
})
