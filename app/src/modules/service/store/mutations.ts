import * as types from './types'

export default {
  [types.SERVICE_LIST] (state: any) {
    return state.items
  },

  [types.SERVICE_ADD] (state: any, item: any) {
    state.items.push(item)
  },

  [types.SERVICE_REMOVE] (state: any, id: any) {
    state.items = state.items.filter((item: any) => item.id !== id)
  }
}
