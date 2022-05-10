import state from './state'
import actions from './actions'
import mutations from './mutations'

export default {
  namespaced: true,
  state,
  mutations,
  actions,
  getters: {
    getMenuTree: (state) => {
      return state.menu_tree
    },
    getAccountDetail: (state) => {
      return state.account_detail
    },
    getAuthorityList: (state) => {
      return state.authority_list
    }
  }
}
