/// <reference types="@/shims-vue" />
declare const moduleRoute: {
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
export default moduleRoute;
//# sourceMappingURL=router.d.ts.map