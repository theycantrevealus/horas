import CoreService from '@/service/core/sidemenu'

export const coreMenu = {
  namespaced: true,
  state: {
    menuData: {}
  },
  getters: {
    getData: (state:any) => { return state.menuData }
  },
  actions: {
    get_all_menu: ({ commit, rootState }:{ commit: Function, rootState: any }) => {
      return CoreService.generateMenuManager(rootState.credential.token).then((response: any) => {
        commit('SET_DATA', response.data.response_package)
        return response
      })
    }
  },
  mutations: {
    SET_DATA (state: any, data: any) {
      state.menuData = data
    }
  }
}
