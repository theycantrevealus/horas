import { createStore } from 'vuex'
import PersistedState from 'vuex-persistedstate'
import SecureLS from 'secure-ls'
import { account } from '@/store/account'
import { TAccountLogin } from '@/model/Account'

import AccountService from '@/service/account'
import CoreService from '@/service/core/sidemenu'
import { coreMenu } from '@/store/core/menu'
import getBrowserLocale from '@/util/i18n/browser.config'

const ls = new SecureLS({ isCompression: false })
const store = createStore({
  state: {
    loading: 0,
    language: {},
    languageMeta: {
      EN: {
        code: 'US',
        name: 'United States',
      },
      ID: {
        code: 'ID',
        name: 'United States',
      },
    },
    credential: {
      uid: '',
      first_name: '',
      last_name: '',
      permission: {},
      profile_photo: '',
      pages: {},
      routes: [],
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
    coreLogin: async ({ commit }, accountRequestData: TAccountLogin) => {
      return await AccountService.login(accountRequestData).then(
        (response: any) => {
          response = response.data
          if (response.status === 200) {
            commit('mutateUpdateToken', response.token)
            commit('mutateLoginSuccess', response.account)
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
  },
  mutations: {
    mutateSetBrowserLanguage: (state: any, countryCodeOnly = false) => {
      const selectedLanguage: string = getBrowserLocale({
        countryCodeOnly: countryCodeOnly,
      })?.toUpperCase()
      state.language = state.languageMeta[selectedLanguage]
    },
    mutateUpdateAccess: (state: any, data) => {
      const grantedPerm = data.grantedPerm
      const buildPermission = {}
      for (let a in grantedPerm) {
        if (buildPermission[grantedPerm[a].domiden]) {
          buildPermission[grantedPerm[a].domiden] = {}
        }

        buildPermission[grantedPerm[a].domiden] = grantedPerm[a]
      }

      state.credential.permission = buildPermission

      const grantedPage = data.grantedPage
      const buildPage = {}
      const routes: string[] = ['/login']
      for (let a in grantedPage) {
        if (buildPage[`page_${grantedPage[a].id}`]) {
          buildPage[`page_${grantedPage[a].id}`] = {}
        }
        buildPage[`page_${grantedPage[a].id}`] = grantedPage[a]

        routes.push(grantedPage[a].identifier)
      }
      state.credential.routes = routes
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
      state.credential.uid = credentialData.uid
      state.credential.first_name = credentialData.first_name
      state.credential.last_name = credentialData.last_name
      state.credential.profile_photo = credentialData.image

      const grantedPerm = credentialData.grantedPerm
      const buildPermission = {}
      for (let a in grantedPerm) {
        if (buildPermission[grantedPerm[a].domiden]) {
          buildPermission[grantedPerm[a].domiden] = {}
        }

        buildPermission[grantedPerm[a].domiden] = grantedPerm[a]
      }

      state.credential.permission = buildPermission

      const grantedPage = credentialData.grantedPage
      const buildPage = {}
      const routes: string[] = ['/login']
      for (let a in grantedPage) {
        if (buildPage[`page_${grantedPage[a].id}`]) {
          buildPage[`page_${grantedPage[a].id}`] = {}
        }
        buildPage[`page_${grantedPage[a].id}`] = grantedPage[a]

        routes.push(grantedPage[a].identifier)
      }
      state.credential.routes = routes
      state.credential.pages = buildPage
    },
    mutateClearSession(state: any) {
      state.credential.token = null
    },
  },
  modules: {
    mAccount: account,
    mCoreMenu: coreMenu,
  },
})

export default store
