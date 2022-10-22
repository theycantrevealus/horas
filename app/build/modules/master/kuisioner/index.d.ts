/// <reference types="@/shims-vue" />
declare const _default: {
    router: {
        path: string;
        name: string;
        component: () => Promise<typeof import("*.vue")>;
        meta: {
            pageTitle: string;
            requiresAuth: boolean;
            breadcrumb: {
                label: string;
                to: string;
            }[];
        };
        children: {
            path: string;
            name: string;
            meta: {
                pageTitle: string;
                requiresAuth: boolean;
                breadcrumb: {
                    label: string;
                    to: string;
                }[];
            };
            component: () => Promise<typeof import("*.vue")>;
        }[];
    }[];
    store: {
        namespaced: boolean;
        state: () => {
            DTLoading: boolean;
            DTTotalRecord: number;
            items: never[];
        };
        mutations: {
            AUTHORITY_SET(state: any, items: any): void;
            AUTHORITY_LIST(state: any): any;
            AUTHORITY_ADD(state: any, item: any): void;
            AUTHORITY_REMOVE(state: any, id: any): void;
            TOGGLE_LOADING_ACTIVE(state: any): void;
            TOGGLE_LOADING_UNACTIVE(state: any): void;
            DT_SET_TOTAL_RECORDS(state: any, total: number): void;
        };
        actions: {
            fetchAuthority({ commit }: {
                commit: any;
            }, paramData: any): void;
        };
        getters: {
            getAuthority: (state: any) => any;
        };
    };
};
export default _default;
//# sourceMappingURL=index.d.ts.map