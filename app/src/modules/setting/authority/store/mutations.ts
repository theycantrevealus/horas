import * as types from './types'

export default {
  [types.AUTHORITY_SET] (state: any, items: any) {
    state.items = items
  },
  [types.AUTHORITY_LIST] (state: any) {
    return state.items
  },

  [types.AUTHORITY_ADD] (state: any, item: any) {
    state.items.push(item)
  },

  [types.AUTHORITY_REMOVE] (state: any, id: any) {
    state.items = state.items.filter((item: any) => item.id !== id)
  },
  [types.TOGGLE_LOADING_ACTIVE] (state: any) {
    state.DTLoading = true
  },
  [types.TOGGLE_LOADING_UNACTIVE] (state: any) {
    state.DTLoading = false
  },
  [types.DT_SET_TOTAL_RECORDS] (state: any, total: number) {
    state.DTTotalRecord = total
  }
}
