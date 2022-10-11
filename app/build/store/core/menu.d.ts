export declare const coreMenu: {
    namespaced: boolean;
    state: {
        menuData: {};
    };
    getters: {
        getData: (state: any) => any;
    };
    actions: {
        get_all_menu: ({ commit, rootState, }: {
            commit: Function;
            rootState: any;
        }) => Promise<any>;
    };
    mutations: {
        SET_DATA(state: any, data: any): void;
    };
};
//# sourceMappingURL=menu.d.ts.map