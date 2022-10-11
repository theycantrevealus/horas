import * as types from './types';
export default {
    [types.MASTER_ITEM_LIST](state) {
        return state.items;
    },
    [types.MASTER_ITEM_ADD](state, item) {
        state.items.push(item);
    },
    [types.MASTER_ITEM_REMOVE](state, id) {
        state.items = state.items.filter((item) => item.id !== id);
    }
};
//# sourceMappingURL=mutations.js.map