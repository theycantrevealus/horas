import * as types from './types'
import AccountService from '@/modules/setting/account/service'

export default {
  fetchMenu ({ commit }) {
    AccountService.getMenu().then((response: any) => {
      const data = response.data
      commit(types.MENU_SET, data)
    })
  },

  async updateAccount ({ commit, state }, data) {
    return await AccountService.updateAccount(data).then((response: any) => {
      return response
    })
  },

  async updateAccess ({ commit, state }, parsedData) {
    return await AccountService.updateAccess(parsedData).then((response: any) => {
      return response
    })
  },

  async updatePermission ({ commit, state }, parsedData) {
    return await AccountService.updatePermission(parsedData).then((response: any) => {
      return response
    })
  },

  async fetchAuthority ({ commit }) {
    AccountService.getAuthorityList().then((response: any) => {
      const data = response.data
      commit(types.AUTHORITY_SET, data)
    })
  },

  async fetchAccountActivity ({ commit }, param: any) {
    AccountService.getAccountActivity(param.uid, param.from, param.to).then((response: any) => {
      const data = response.data
      commit(types.ACCOUNT_ACTIVITY, data)
    })
  },

  async fetchAccountDetail ({ commit }, uid) {
    AccountService.getAccountDetail(uid).then((response: any) => {
      const data = response.data
      commit(types.ACCOUNT_DETAIL, data)
    })
  },

  async fetchMenuTree ({ commit }) {
    AccountService.menuTree().then((response: any) => {
      const data = response.data.root
      commit(types.MENU_TREE_SET, data)
    })
  }
}
