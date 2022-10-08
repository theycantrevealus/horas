const moduleRoute = [
  {
    path: '/account',
    name: 'Account',
    component: async () =>
      import(
        /* webpackChunkName: "account" */ '@/modules/setting/account/Module.vue'
      ),
    meta: {
      pageTitle: 'Account Management Builder',
      requiresAuth: true,
      breadcrumb: [
        {
          label: 'Account',
          to: '/account',
        },
      ],
    },
    children: [
      {
        path: '',
        name: 'AccountList',
        meta: {
          pageTitle: 'Account Management',
          requiresAuth: true,
          breadcrumb: [],
        },
        component: async () =>
          import(
            /* webpackChunkName: "account" */ '@/modules/setting/account/views/Index.vue'
          ),
      },
      {
        path: 'add',
        name: 'AccountAdd',
        meta: {
          pageTitle: 'Account Add',
          requiresAuth: true,
          breadcrumb: [
            {
              label: 'Account',
              to: '/account',
            },
          ],
        },
        component: async () =>
          import(
            /* webpackChunkName: "account" */ '@/modules/setting/account/views/Add.vue'
          ),
      },
      {
        path: 'edit/:id',
        name: 'AccountEdit',
        meta: {
          pageTitle: 'Account Edit',
          requiresAuth: true,
          breadcrumb: [
            {
              label: 'Account',
              to: '/account',
            },
          ],
        },
        component: async () =>
          import(
            /* webpackChunkName: "account" */ '@/modules/setting/account/views/Edit.vue'
          ),
      },
    ],
  },
]

export default moduleRoute
