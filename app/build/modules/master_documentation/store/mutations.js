import * as types from './types';
export default {
    [types.DOCUMENTATION_LIST](state) {
        return state.items;
    },
    [types.DOCUMENTATION_ADD](state, item) {
        state.items.push(item);
    },
    [types.DOCUMENTATION_REMOVE](state, id) {
        state.items = state.items.filter((item) => item.id !== id);
    }
};
//# sourceMappingURL=mutations.js.map