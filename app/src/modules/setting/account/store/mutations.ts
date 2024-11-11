import * as types from './types'

export default {
  [types.ACCOUNT_LIST] (state: any) {
    return state.items
  },

  [types.AUTHORITY_LIST] (state: any) {
    return state.authority_list
  },

  [types.AUTHORITY_SET] (state: any, item: any) {
    state.authority_list = item
  },

  [types.ACCOUNT_DETAIL] (state: any, item: any) {
    state.account_detail = item
  },

  [types.ACCOUNT_DETAIL_GET] (state: any) {
    return state.account_detail
  },

  [types.ACCOUNT_ADD] (state: any, item: any) {
    state.items.push(item)
  },

  [types.ACCOUNT_REMOVE] (state: any, id: any) {
    state.items = state.items.filter((item: any) => item.id !== id)
  },

  [types.MENU_LIST] (state: any) {
    return state.menu_list
  },

  [types.MENU_SET] (state: any, items: any) {
    state.menu_list = items
  },

  [types.MENU_TREE_SET] (state: any, items: any) {
    state.menu_tree = items
  },

  [types.MENU_TREE_GET] (state: any) {
    return state.menu_tree
  }
}
