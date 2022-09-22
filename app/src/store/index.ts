import { createStore } from 'vuex'
import PersistedState from 'vuex-persistedstate'
import SecureLS from 'secure-ls'
import { account } from '@/store/account'
import { TAccountLogin } from '@/model/Account'

import AccountService from '@/service/account'
import CoreService from '@/service/core/sidemenu'
import { coreMenu } from '@/store/core/menu'

const ls = new SecureLS({ isCompression: false })
const store = createStore({
  state: {
    loading: 0,
    credential: {
      uid: '',
      first_name: '',
      last_name: '',
      permission: {},
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
    LOGIN: async ({ commit }, accountRequestData: TAccountLogin) => {
      return await AccountService.login(accountRequestData).then(
        (response: any) => {
          response = response.data
          if (response.status === 200) {
            commit('UPDATE_TOKEN', response.token)
            commit('LOGIN_SUCCESS', response.account)
          }
          return response
        }
      )
    },
    UPDATE_MENU: async ({ commit, getters }) => {
      return await CoreService.generateMenu(getters.getToken).then(
        (response: any) => {
          response = response.data
          commit('UPDATE_MENU', response)
        }
      )
    },
    LOGOUT: ({ commit }: { commit: Function }) => {
      commit('CLEAR_SESSION')
    },
  },
  getters: {
    getToken: (state) => {
      return state.credential.token
    },
    getSideMenu: (state) => {
      return state.sidemenu
    },
  },
  mutations: {
    START_LOADING: (state) => state.loading++,
    FINISH_LOADING: (state) => state.loading--,
    GET_TOKEN: (state) => state.credential.token,
    UPDATE_TOKEN(state: any, token: string) {
      state.credential.token = token
    },
    UPDATE_MENU(state: any, menu) {
      state.sidemenu = menu
    },
    LOGIN_SUCCESS(state: any, credentialData) {
      state.credential.uid = credentialData.uid
      state.credential.first_name = credentialData.first_name
      state.credential.last_name = credentialData.last_name
      console.log(state.credential)

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
      state.credential.routes.push('/login')
      for (let a in grantedPage) {
        if (buildPage[`page_${grantedPage[a].id}`]) {
          buildPage[`page_${grantedPage[a].id}`] = {}
        }
        buildPage[`page_${grantedPage[a].id}`] = grantedPage[a]

        state.credential.routes.push(grantedPage[a].identifier)
      }
      console.log(buildPage)
      state.credential.pages = buildPage
    },
    CLEAR_SESSION(state: any) {
      state.credential.token = null
    },
  },
  modules: {
    mAccount: account,
    mCoreMenu: coreMenu,
  },
})

export default store
