import * as types from './types'

export default {
  [types.ACCOUNT_LIST] (state: any) {
    return state.items
  },

  [types.ACCOUNT_ADD] (state: any, item: any) {
    state.items.push(item)
  },

  [types.ACCOUNT_REMOVE] (state: any, id: any) {
    state.items = state.items.filter((item: any) => item.id !== id)
  }
}
