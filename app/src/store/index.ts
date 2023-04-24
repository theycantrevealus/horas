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

import {CoreResponse, CoreResponseLib} from "@/model/Response";

import { credential } from "@/store/states/credential";
import { socket } from "@/store/states/socket";
import {task} from "@/store/states/task";
import {application} from "@/store/states/application";

const ls = new SecureLS({ isCompression: false })
const store = createStore({
  state: {
    ...application,
    ...socket,
    ...task,
    credential: credential,
    connect: false,
    reconnecting: false,
    message: '',
    menuMode: false,
    themeModeDark: false,
    loading: 0,
    language: {},
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
    socket_connect: ({ commit }) => {
      commit('socket_status', {
        connect: true,
      })
    },
    socket_disconnect: ({ commit }) => {
      commit('socket_status', {
        disconnect: true
      })
    },
    socket_reconnecting: ({ commit }) => {
      commit('socket_status', {
        reconnecting: true
      })
    },
    socket_error: ({ commit }) => {
      commit('socket_status', {
        error: true
      })
    },
    socket_connect_error: ({ commit }) => {
      commit('socket_status', {
        disconnect: true
      })
    },
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
      return await AccountService.signIn(accountRequestData).then(
        (response: CoreResponse) => {
          if (response.statusCode === CoreResponseLib.Login.success) {
            commit('mutateUpdateToken', response.payload.token)
            commit('mutateLoginSuccess', response.payload.account)
            commit('mutateSystemConfig', response.payload.config)
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
    getCredential: (state) => {
      return state.credential
    },
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
    getSocketSession: (state) => {
      return state.socket.status
    },
    getCurrentLanguage: (state) => {
      return state.languageMeta
    },
    getTask: (state) => {
      return state.task
    },
  },
  mutations: {
    socket_status: (state: any, payload: any) => {
      state.socket.status = {
        connect: false,
        connect_error: false,
        connect_timeout: false,
        connecting: false,
        disconnect: false,
        reconnect: false,
        reconnect_attempt: false,
        reconnecting: false,
        reconnect_error: false,
        reconnect_failed: false,
        error: false,
        ping: false,
        pong: false,
      }
      state.socket.status[Object.keys(payload)[0]] = payload[Object.keys(payload)[0]]
    },
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
      const grantedPage = data.access
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

      const grantedPerm = data.permission
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
    mutateUpdateTask: (state, data: any) => {
      if(!state.task[data.identifier]) {
        state.task[data.identifier] = []
      }

      state.task[data.identifier].push(data.task)
    },
    mutateStartLoading: (state) => state.loading++,
    mutateFinishLoading: (state) => state.loading--,
    mutateUpdateToken(state: any, token: string) {
      state.credential.token = token
    },
    mutateUpdateMenu(state: any, menu) {
      state.sidemenu = menu
    },
    mutateSystemConfig(state: any, data) {
      state.application = data
    },
    mutateLoginSuccess(state: any, credentialData) {
      state.credential.id = credentialData.id
      state.credential.first_name = credentialData.first_name
      state.credential.last_name = credentialData.last_name

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
