declare const _default: {
    namespaced: boolean;
    state: () => {
        account_detail: {};
        authority_list: never[];
        menu_list: never[];
        menu_tree: {};
    };
    mutations: {
        ACCOUNT_LIST(state: any): any;
        AUTHORITY_LIST(state: any): any;
        AUTHORITY_SET(state: any, item: any): void;
        ACCOUNT_DETAIL(state: any, item: any): void;
        ACCOUNT_DETAIL_GET(state: any): any;
        ACCOUNT_ADD(state: any, item: any): void;
        ACCOUNT_REMOVE(state: any, id: any): void;
        MENU_LIST(state: any): any;
        MENU_SET(state: any, items: any): void;
        MENU_TREE_SET(state: any, items: any): void;
        MENU_TREE_GET(state: any): any;
    };
    actions: {
        fetchMenu({ commit }: {
            commit: any;
        }): void;
        updateAccount({ commit, state }: {
            commit: any;
            state: any;
        }, data: any): Promise<any>;
        updateAccess({ commit, state }: {
            commit: any;
            state: any;
        }, parsedData: any): Promise<any>;
        updatePermission({ commit, state }: {
            commit: any;
            state: any;
        }, parsedData: any): Promise<any>;
        fetchAuthority({ commit }: {
            commit: any;
        }): Promise<void>;
        fetchAccountActivity({ commit }: {
            commit: any;
        }, param: any): Promise<void>;
        fetchAccountDetail({ commit }: {
            commit: any;
        }, id: any): Promise<void>;
        fetchMenuTree({ commit }: {
            commit: any;
        }): Promise<void>;
    };
    getters: {
        getMenuTree: (state: any) => any;
        getAccountDetail: (state: any) => any;
        getAuthorityList: (state: any) => any;
    };
};
export default _default;
//# sourceMappingURL=index.d.ts.map