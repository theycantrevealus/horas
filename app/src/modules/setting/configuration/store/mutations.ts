import * as types from './types'

export default {
  [types.APPLICATION_CONFIGURATION_LIST] (state: any) {
    return state.items
  },

  [types.APPLICATION_CONFIGURATION_ADD] (state: any, item: any) {
    state.items.push(item)
  },

  [types.APPLICATION_CONFIGURATION_REMOVE] (state: any, id: any) {
    state.items = state.items.filter((item: any) => item.id !== id)
  }
}
