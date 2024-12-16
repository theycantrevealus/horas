import * as types from './type'

export default {
  [types.USER_LIST] (state: any) {
    return state.items
  },

  [types.USER_ADD] (state: any, item: any) {
    state.items.push(item)
  },

  [types.USER_REMOVE] (state: any, id: any) {
    state.items = state.items.filter((item: any) => item.id !== id)
  }
}
