import * as types from './types'
import {GENERAL_RECEIVE_NOTE_LIST} from "./types";

export default {
  [types.GENERAL_RECEIVE_NOTE_LIST] (state: any) {
    return state.items
  },

  [types.GENERAL_RECEIVE_NOTE_ADD] (state: any, item: any) {
    state.items.push(item)
  },

  [types.GENERAL_RECEIVE_NOTE_REMOVE] (state: any, id: any) {
    state.items = state.items.filter((item: any) => item.id !== id)
  }
}
