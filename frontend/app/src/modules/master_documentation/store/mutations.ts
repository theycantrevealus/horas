import * as types from './types'

export default {
  [types.DOCUMENTATION_LIST] (state: any) {
    return state.items
  },

  [types.DOCUMENTATION_ADD] (state: any, item: any) {
    state.items.push(item)
  },

  [types.DOCUMENTATION_REMOVE] (state: any, id: any) {
    state.items = state.items.filter((item: any) => item.id !== id)
  }
}
