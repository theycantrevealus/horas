import * as types from './types';
export default {
    [types.I18N_SET](state, items) {
        state.items = items;
    },
    [types.I18N_LIST](state) {
        return state.items;
    },
    [types.I18N_ADD](state, item) {
        state.items.push(item);
    },
    [types.I18N_REMOVE](state, id) {
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
    },
};
//# sourceMappingURL=mutations.js.map