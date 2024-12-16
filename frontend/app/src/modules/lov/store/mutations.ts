import * as types from './types'

export default {
  [types.LOV_LIST] (state: any) {
    return state.items
  },

  [types.LOV_ADD] (state: any, item: any) {
    state.items.push(item)
  },

  [types.LOV_REMOVE] (state: any, id: any) {
    state.items = state.items.filter((item: any) => item.id !== id)
  }
}
