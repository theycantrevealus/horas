import * as types from './types'

export default {
  [types.DATA_SET](state: any, items: any) {
    state.items = items
  },
}
