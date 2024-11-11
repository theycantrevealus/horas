import state from './state'
import actions from './actions'
import mutations from './mutations'

export default {
  namespaced: true,
  state,
  mutations,
  actions,
  getters: {
    fetchi18nDetail: (state) => {
      return state.items
    },
  },
}
