import * as types from './types';
export default {
    [types.AUTHORITY_SET](state, items) {
        state.items = items;
    },
    [types.AUTHORITY_LIST](state) {
        return state.items;
    },
    [types.AUTHORITY_ADD](state, item) {
        state.items.push(item);
    },
    [types.AUTHORITY_REMOVE](state, id) {
        state.items = state.items.filter((item) => item.id !== id);
    },
    [types.TOGGLE_LOADING_ACTIVE](state) {
        state.DTLoading = true;
    },
    [types.TOGGLE_LOADING_UNACTIVE](state) {
        state.DTLoading = false;
    },
    [types.DT_SET_TOTAL_RECORDS](state, total) {
        state.DTTotalRecord = total;
    }
};
//# sourceMappingURL=mutations.js.map