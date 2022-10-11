const moduleRoute = [
    {
        path: '/authority',
        name: 'Authority',
        component: () => import(
        /* webpackChunkName: "authority" */ '@/modules/setting/authority/Module.vue'),
        meta: {
            pageTitle: 'Account Authority Management Builder',
            requiresAuth: true,
            breadcrumb: [
                {
                    label: 'Account Authority',
                    to: '/authority',
                },
            ],
        },
        children: [
            {
                path: '',
                name: 'AccountAuthorityList',
                meta: {
                    pageTitle: 'Account Authority Management',
                    requiresAuth: true,
                    breadcrumb: [
                        {
                            label: 'Account Authority',
                            to: '/authority',
                        },
                    ],
                },
                component: () => import(
                /* webpackChunkName: "authority" */ '@/modules/setting/authority/views/Index.vue'),
            },
            {
                path: 'add',
                name: 'AccountAuthorityAdd',
                meta: {
                    pageTitle: 'Account Authority Add',
                    requiresAuth: true,
                    breadcrumb: [
                        {
                            label: 'Account Authority',
                            to: '/authority/list',
                        },
                    ],
                },
                component: () => import(
                /* webpackChunkName: "authority" */ '@/modules/setting/authority/views/Add.vue'),
            },
            {
                path: 'edit/:id',
                name: 'AccountAuthorityEdit',
                meta: {
                    pageTitle: 'Account Authority Edit',
                    requiresAuth: true,
                    breadcrumb: [
                        {
                            label: 'Account Authority',
                            to: '/authority',
                        },
                    ],
                },
                component: () => import(
                /* webpackChunkName: "authority" */ '@/modules/setting/authority/views/Edit.vue'),
            },
        ],
    },
];
export default moduleRoute;
//# sourceMappingURL=router.js.map