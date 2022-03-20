export const account = {
  namespaced: true,
  state: {},
  getters: {
    getAuthenticated: (state:any) => {
      return state.credential
    }
  },
  actions: {
  },
  mutations: {

  }
}
