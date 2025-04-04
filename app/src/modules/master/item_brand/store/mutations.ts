import * as types from './types'

export default {
  [types.MASTER_ITEM_BRAND_LIST] (state: any) {
    return state.items
  },

  [types.MASTER_ITEM_BRAND_ADD] (state: any, item: any) {
    state.items.push(item)
  },

  [types.MASTER_ITEM_BRAND_REMOVE] (state: any, id: any) {
    state.items = state.items.filter((item: any) => item.id !== id)
  }
}
