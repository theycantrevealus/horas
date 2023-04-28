import Corei18nService from '@/service/core/i18n'

export const corei18n = {
  namespaced: true,
  state: {
    languageData: [],
  },
  getters: {
    getData: (state: any) => {
      return state.languageData
    },
  },
  actions: {
    get_all_i18n: async ({ commit, rootState }) => {
      return await Corei18nService.generatei18n()
        .then((response) => {
          commit('SET_DATA', response?.data)
          return response
        })
        .catch((e) => {
          //
        })
    },
  },
  mutations: {
    SET_DATA(state: any, data: any) {
      state.languageData = data
    },
  },
}
