import * as types from './types'
import AuthorityService from '@/modules/setting/authority/service'

export default {
  fetchAuthority ({ commit }, paramData) {
    commit(types.TOGGLE_LOADING_ACTIVE)
    AuthorityService.getAuthorityList(paramData).then((response: any) => {
      const data = response.data.list
      const totalRecords = response.data.totalRecords

      commit(types.AUTHORITY_SET, data)
      commit(types.AUTHORITY_LIST, data)
      commit(types.DT_SET_TOTAL_RECORDS, totalRecords)
      commit(types.TOGGLE_LOADING_UNACTIVE)
    })
  }
}
