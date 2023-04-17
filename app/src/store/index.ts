import { createStore } from 'vuex'
import PersistedState from 'vuex-persistedstate'
import SecureLS from 'secure-ls'
import { account } from '@/store/account'
import { TAccountLogin } from '@/model/Account'

import AccountService from '@/service/account'
import CoreService from '@/service/core/sidemenu'
import { coreMenu } from '@/store/core/menu'
import getBrowserLocale from '@/util/i18n/browser.config'
import { corei18n } from './core/i18n'

const ls = new SecureLS({ isCompression: false })
const store = createStore({
  state: {
    menuMode: false,
    themeModeDark: false,
    loading: 0,
    language: {},
    languageMeta: {
      en: {
        code: 'us',
        lang: 'en',
        name: 'United States',
      },
      id: {
        code: 'id',
        lang: 'id',
        name: 'Indonesia',
      },
    },
    credential: {
      id: 0,
      first_name: '',
      last_name: '',
      permission: {},
      profile_photo: '',
      pages: {},
      routes: [],
      routeMap: {},
      token: null,
    },
    sidemenu: [],
  },
  plugins: [
    PersistedState({
      storage: {
        getItem: (key) => ls.get(key),
        setItem: (key, value) => ls.set(key, value),
        removeItem: (key) => ls.remove(key),
      },
    }),
  ],
  actions: {
    toggleMenuOn: async ({ commit }) => {
      commit('mutateSidePanelToggleOn')
    },
    toggleMenuOff: async ({ commit }) => {
      commit('mutateSidePanelToggleOff')
    },
    toggleDarkMode: async ({ commit }) => {
      commit('mutateThemeDark')
    },
    coreLogin: async ({ commit }, accountRequestData: TAccountLogin) => {
      return await AccountService.login(accountRequestData).then(
        (response: any) => {
          response = response.data
          if (response.statusCode === 'ACC_I_S0000') {
            commit('mutateUpdateToken', response.payload.token)
            commit('mutateLoginSuccess', response.payload.account)
          }
          return response
        }
      )
    },
    coreRefreshAccess: async ({ commit, getters }) => {
      return await CoreService.refreshAccess().then((response: any) => {
        response = response.data
        commit('mutateUpdateAccess', response)
      })
    },
    coreUpdateMenu: async ({ commit, getters }) => {
      return await CoreService.generateMenu(getters.getToken).then(
        (response: any) => {
          response = response.data
          commit('mutateUpdateMenu', response)
        }
      )
    },
    coreLogout: ({ commit }: { commit: Function }) => {
      commit('mutateClearSession')
    },
    setLanguange: ({ commit }) => {
      commit('mutateSetBrowserLanguage', true)
    },
    changeLanguage: ({ commit }, data) => {
      commit('mutateChangeLanguage', data)
    },
  },
  getters: {
    getToken: (state) => {
      return state.credential.token
    },
    getPrivileges: (state) => {
      return state.credential.pages
    },
    getSideMenu: (state) => {
      return state.sidemenu
    },
    getBrowserLanguage: (state) => {
      return state.language
    },
    getMenuModeStatus: (state) => {
      return state.menuMode
    },
    getThemeMode: (state) => {
      return state.themeModeDark
    },
  },
  mutations: {
    mutateSidePanelToggleOn: (state: any) => {
      state.menuMode = true
    },
    mutateSidePanelToggleOff: (state: any) => {
      state.menuMode = false
    },
    mutateThemeDark: (state: any) => {
      state.themeModeDark = !state.themeModeDark
    },
    mutateSetBrowserLanguage: (state: any, countryCodeOnly = false) => {
      const selectedLanguage: string = getBrowserLocale({
        countryCodeOnly: countryCodeOnly,
      })
      state.language = state.languageMeta[selectedLanguage]
    },
    mutateChangeLanguage: (state: any, language) => {
      state.language = state.languageMeta[language.lang]
    },
    mutateUpdateAccess: (state: any, data) => {
      data = data.payload
      const grantedPerm = data.permission
      const buildPermission = {}
      for (let a in grantedPerm) {
        if (buildPermission[grantedPerm[a].domIdentity]) {
          buildPermission[grantedPerm[a].domIdentity] = {}
        }

        buildPermission[grantedPerm[a].domIdentity] = grantedPerm[a]
      }

      state.credential.permission = buildPermission

      const grantedPage = data.access
      const buildPage = {}
      const routes: string[] = ['Login']
      const routeMap = {}
      for (let a in grantedPage) {
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

      state.credential.routes = []
      state.credential.routes = routes
      state.credential.routeMap = routeMap
      state.credential.pages = buildPage
    },
    mutateStartLoading: (state) => state.loading++,
    mutateFinishLoading: (state) => state.loading--,
    mutateUpdateToken(state: any, token: string) {
      state.credential.token = token
    },
    mutateUpdateMenu(state: any, menu) {
      state.sidemenu = menu
    },
    mutateLoginSuccess(state: any, credentialData) {
      state.credential.id = credentialData.id
      state.credential.first_name = credentialData.first_name
      state.credential.last_name = credentialData.last_name
      // state.credential.profile_photo = credentialData.image

      const grantedPage = credentialData.access
      const buildPage = {}
      const routes: string[] = ['Login']
      const routeMap = {}
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

      const grantedPerm = credentialData.permission
      const buildPermission = {}
      for (let a in grantedPerm) {
        if (buildPermission[grantedPerm[a].domIdentity]) {
          buildPermission[grantedPerm[a].domIdentity] = {}
        }
        buildPermission[grantedPerm[a].domIdentity] = grantedPerm[a]
        if(routeMap[grantedPerm[a].menu.identifier]) {
          if(!routeMap[grantedPerm[a].menu.identifier].permission) {
            routeMap[grantedPerm[a].menu.identifier].permission = []

            // if(!routeMap[grantedPerm[a].menu.identifier].permission[grantedPerm[a].domIdentity]) {
            //   routeMap[grantedPerm[a].menu.identifier].permission[grantedPerm[a].domIdentity] = {}
            // }
          }

          if(routeMap[grantedPerm[a].menu.identifier].permission.indexOf(grantedPerm[a].dispatchName) < 0) {
            routeMap[grantedPerm[a].menu.identifier].permission.push(grantedPerm[a].dispatchName)
          }

          if(!routeMap[grantedPerm[a].dispatchName]) {
            routeMap[grantedPerm[a].dispatchName] = {}
          }
        }

        // routeMap[grantedPerm[a].menu.identifier].permission[grantedPerm[a].domIdentity] = grantedPerm[a]
      }

      state.credential.permission = buildPermission
      state.credential.routes = routes
      state.credential.routeMap = routeMap
      state.credential.pages = buildPage
    },
    mutateClearSession(state: any) {
      state.credential.token = null
    },
  },
  modules: {
    mAccount: account,
    mCoreMenu: coreMenu,
    mCorei18n: corei18n,
  },
})

export default store
