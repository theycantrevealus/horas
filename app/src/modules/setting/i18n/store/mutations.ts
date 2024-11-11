import * as types from './types'

export default {
  [types.I18N_SET](state: any, items: any) {
    state.items = items
  },
  [types.I18N_LIST](state: any) {
    return state.items
  },

  [types.I18N_ADD](state: any, item: any) {
    state.items.push(item)
  },

  [types.I18N_REMOVE](state: any, id: any) {
    state.items = state.items.filter((item: any) => item.id !== id)
  },
  [types.TOGGLE_LOADING_ACTIVE](state: any) {
    state.DTLoading = true
  },
  [types.TOGGLE_LOADING_UNACTIVE](state: any) {
    state.DTLoading = false
  },
  [types.DT_SET_TOTAL_RECORDS](state: any, total: number) {
    state.DTTotalRecord = total
  },
}
