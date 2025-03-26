import type { RouteRecordRaw } from 'vue-router'

const moduleRoute: RouteRecordRaw[] = [
  {
    path: '/core/account',
    name: 'AccountBuilder',
    component: () => import('@/modules/core/account/Module.vue'),
    meta: {
      pageTitle: 'Account Management Builder',
      requiresAuth: true,
      breadcrumb: [
        {
          label: 'Account Management',
          to: '/core/account',
        },
      ],
    },
    children: [
      {
        path: '',
        name: 'Account',
        meta: {
          pageTitle: 'Account Management',
          requiresAuth: true,
          breadcrumb: [
            {
              label: 'Account Management',
              to: '/core/account',
            },
          ],
        },
        component: () => import('@/modules/core/account/views/Index.vue'),
      },
      {
        path: 'add',
        name: 'AccountAdd',
        meta: {
          pageTitle: 'Add New Account',
          requiresAuth: true,
          breadcrumb: [
            {
              label: 'Account Management',
              to: '/core/account',
            },
          ],
        },
        component: () => import('@/modules/core/account/views/Add.vue'),
      },
      {
        path: 'edit/:id',
        name: 'AccountEdit',
        meta: {
          pageTitle: 'Edit Account',
          requiresAuth: true,
          breadcrumb: [
            {
              label: 'Account Management',
              to: '/core/account',
            },
          ],
        },
        component: () => import('@/modules/core/account/views/Edit.vue'),
      },
    ],
  },
]
export default moduleRoute
