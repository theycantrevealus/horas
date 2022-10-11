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
        children: ({
            path: string;
            name: string;
            meta: {
                pageTitle: string;
                requireAuth: boolean;
                breadcrumb: {
                    label: string;
                    to: string;
                }[];
                requiresAuth?: undefined;
            };
            component: () => Promise<typeof import("*.vue")>;
        } | {
            path: string;
            name: string;
            meta: {
                pageTitle: string;
                requiresAuth: boolean;
                breadcrumb: {
                    label: string;
                    to: string;
                }[];
                requireAuth?: undefined;
            };
            component: () => Promise<typeof import("*.vue")>;
        })[];
    }[];
    store: {
        namespaced: boolean;
        state: () => {
            items: never[];
        };
        mutations: {
            USER_LIST(state: any): any;
            USER_ADD(state: any, item: any): void;
            USER_REMOVE(state: any, id: any): void;
        };
        actions: {};
    };
};
export default _default;
//# sourceMappingURL=index.d.ts.map