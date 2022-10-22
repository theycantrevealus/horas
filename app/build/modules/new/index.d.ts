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
};
export default _default;
//# sourceMappingURL=index.d.ts.map