export const SocketStore = {
  namespaced: true,
  state: {
    status: {
      connect: false,
      connect_error: false,
      connect_timeout: false,
      connecting: false,
      disconnect: false,
      reconnect: false,
      reconnect_attempt: false,
      reconnecting: false,
      reconnect_error: false,
      reconnect_failed: false,
      error: false,
      ping: false,
      pong: false,
    }
  },
  getters: {
    Getter___status: (state) => {
      return state.status
    },
  },
  actions: {
    Action___socket_connect: ({ commit }) => {
      commit('Mutation___reset_status').then(() => {
        commit('Mutation___socket_status', {
          connect: true,
        })
      })
    },
    Action___socket_disconnect: ({ commit }) => {
      commit('Mutation___reset_status').then(() => {
        commit('Mutation___socket_status', {
          disconnect: true
        })
      })
    },
    Action___socket_reconnecting: ({ commit }) => {
      commit('Mutation___reset_status').then(() => {
        commit('Mutation___socket_status', {
          reconnecting: true
        })
      })
    },
    Action___socket_error: ({ commit }) => {
      commit('Mutation___reset_status').then(() => {
        commit('Mutation___socket_status', {
          error: true
        })
      })
    },
    Action___socket_connect_error: ({ commit }) => {
      commit('Mutation___reset_status').then(() => {
        commit('Mutation___socket_status', {
          disconnect: true
        })
      })
    },
  },
  mutations: {
    Mutation___reset_status: (state: any) => {
      state.status = {
        connect: false,
        connect_error: false,
        connect_timeout: false,
        connecting: false,
        disconnect: false,
        reconnect: false,
        reconnect_attempt: false,
        reconnecting: false,
        reconnect_error: false,
        reconnect_failed: false,
        error: false,
        ping: false,
        pong: false,
      }
    },
    Mutation___socket_status: (state: any, payload: any) => {
      state.status[Object.keys(payload)[0]] = payload[Object.keys(payload)[0]]
    },
  },
};
