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
            items: never[];
        };
        mutations: {
            MASTER_ITEM_LIST(state: any): any;
            MASTER_ITEM_ADD(state: any, item: any): void;
            MASTER_ITEM_REMOVE(state: any, id: any): void;
        };
        actions: {};
    };
};
export default _default;
//# sourceMappingURL=index.d.ts.map