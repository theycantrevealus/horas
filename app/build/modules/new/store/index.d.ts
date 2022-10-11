declare const _default: {
    namespaced: boolean;
    state: () => {
        DTLoading: boolean;
        DTTotalRecord: number;
        items: never[];
    };
    mutations: {
        DATA_SET(state: any, items: any): void;
    };
    actions: {
        fetchData({ commit }: {
            commit: any;
        }, paramData: any): void;
    };
    getters: {
        getAuthority: (state: any) => any;
    };
};
export default _default;
//# sourceMappingURL=index.d.ts.map