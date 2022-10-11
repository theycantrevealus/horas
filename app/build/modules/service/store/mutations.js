import * as types from './types';
export default {
    [types.SERVICE_LIST](state) {
        return state.items;
    },
    [types.SERVICE_ADD](state, item) {
        state.items.push(item);
    },
    [types.SERVICE_REMOVE](state, id) {
        state.items = state.items.filter((item) => item.id !== id);
    }
};
//# sourceMappingURL=mutations.js.map