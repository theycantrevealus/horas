import * as types from './types'

export default {
  [types.PURCHASE_ORDER_LIST] (state: any) {
    return state.items
  },

  [types.PURCHASE_ORDER_ADD] (state: any, item: any) {
    state.items.push(item)
  },

  [types.PURCHASE_ORDER_REMOVE] (state: any, id: any) {
    state.items = state.items.filter((item: any) => item.id !== id)
  }
}
