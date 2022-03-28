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
      first_name: '',
      last_name: '',
      permission: {},
      token: null
    },
    sidemenu: []
  },
  plugins: [PersistedState({
    storage: {
      getItem: (key) => ls.get(key),
      setItem: (key, value) => ls.set(key, value),
      removeItem: (key) => ls.remove(key)
    }
  })],
  actions: {
    LOGIN: ({ commit }, accountRequestData: TAccountLogin) => {
      return AccountService.login(accountRequestData).then((response: any) => {
        response = response.data
        if (response.status === 200) {
          commit('UPDATE_TOKEN', response.token)
          commit('LOGIN_SUCCESS', response.account)
        }
        return response
      })
    },
    UPDATE_MENU: ({ commit, getters }) => {
      return CoreService.generateMenu(getters.getToken).then((response: any) => {
        response = response.data.response_package
        commit('UPDATE_MENU', response)
      })
    },
    LOGOUT: ({ commit }: { commit: Function }) => {
      commit('CLEAR_SESSION')
    }
  },
  getters: {
    getToken: (state) => { return state.credential.token },
    getSideMenu: (state) => { return state.sidemenu }
  },
  mutations: {
    START_LOADING: state => state.loading++,
    FINISH_LOADING: state => state.loading--,
    GET_TOKEN: (state) => state.credential.token,
    UPDATE_TOKEN (state: any, token: string) {
      state.credential.token = token
    },
    UPDATE_MENU (state: any, menu) {
      state.sidemenu = menu
    },
    LOGIN_SUCCESS (state: any, credentialData) {
      state.credential.first_name = credentialData.first_name
      state.credential.last_name = credentialData.last_name
      const grantedPage = credentialData.roleandperm
      const buildPermission = {}
      for (const a in grantedPage) {
        if (buildPermission[grantedPage[a].detail.domiden]) {
          buildPermission[grantedPage[a].detail.domiden] = ''
        }

        buildPermission[grantedPage[a].detail.domiden] = grantedPage[a].detail.dispatchname
      }
      state.credential.permission = buildPermission
    },
    CLEAR_SESSION (state: any) {
      state.credential.token = null
    }
  },
  modules: {
    mAccount: account,
    mCoreMenu: coreMenu
  }
})

export default store
