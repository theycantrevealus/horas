import * as types from './types';
export default {
    [types.ACCOUNT_LIST](state) {
        return state.items;
    },
    [types.AUTHORITY_LIST](state) {
        return state.authority_list;
    },
    [types.AUTHORITY_SET](state, item) {
        state.authority_list = item;
    },
    [types.ACCOUNT_DETAIL](state, item) {
        state.account_detail = item;
    },
    [types.ACCOUNT_DETAIL_GET](state) {
        return state.account_detail;
    },
    [types.ACCOUNT_ADD](state, item) {
        state.items.push(item);
    },
    [types.ACCOUNT_REMOVE](state, id) {
        state.items = state.items.filter((item) => item.id !== id);
    },
    [types.MENU_LIST](state) {
        return state.menu_list;
    },
    [types.MENU_SET](state, items) {
        state.menu_list = items;
    },
    [types.MENU_TREE_SET](state, items) {
        state.menu_tree = items;
    },
    [types.MENU_TREE_GET](state) {
        return state.menu_tree;
    }
};
//# sourceMappingURL=mutations.js.map