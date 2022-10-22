import * as types from './types';
export default {
    [types.USER_LIST](state) {
        return state.items;
    },
    [types.USER_ADD](state, item) {
        state.items.push(item);
    },
    [types.USER_REMOVE](state, id) {
        state.items = state.items.filter((item) => item.id !== id);
    }
};
//# sourceMappingURL=mutations.js.map