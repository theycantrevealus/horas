import CoreService from '@/service/core/sidemenu'

export const MenuStore = {
  namespaced: true,
  state: {
    menuData: {},
    ui: {
      sidePanel: {}
    },
  },
  getters: {
    Getter___menuData: (state: any) => {
      return state.menuData
    },
  },
  actions: {
    fetchMenu: async ({ commit, state }: { commit: Function, state: any }) => {
      return await CoreService.generateMenuManager().then((response: any) => {
        commit('Mutation___setMenu', response.data)
        return response
      })
    },
  },
  mutations: {
    Mutation___setMenu(state: any, data: any) {
      state.menuData = data
    },
  },
}
