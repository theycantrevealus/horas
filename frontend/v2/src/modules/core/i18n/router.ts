import type { RouteRecordRaw } from 'vue-router'

const moduleRoute: RouteRecordRaw[] = [
  {
    path: '/core/i18n',
    name: 'i18nBuilder',
    component: () => import('@/modules/core/i18n/Module.vue'),
    meta: {
      pageTitle: 'i18n Management Builder',
      requiresAuth: true,
      breadcrumb: [
        {
          label: 'i18n Management',
          to: '/core/i18n',
        },
      ],
    },
    children: [
      {
        path: '',
        name: 'i18n',
        meta: {
          pageTitle: 'i18n Management',
          requiresAuth: true,
          breadcrumb: [
            {
              label: 'i18n Management',
              to: '/core/i18n',
            },
          ],
        },
        component: () => import('@/modules/core/i18n/views/Index.vue'),
      },
      {
        path: 'add',
        name: 'i18nAdd',
        meta: {
          pageTitle: 'Add New i18n',
          requiresAuth: true,
          breadcrumb: [
            {
              label: 'i18n Management',
              to: '/core/i18n',
            },
          ],
        },
        component: () => import('@/modules/core/i18n/views/Add.vue'),
      },
      {
        path: 'edit/:id',
        name: 'i18nEdit',
        meta: {
          pageTitle: 'Edit i18n',
          requiresAuth: true,
          breadcrumb: [
            {
              label: 'i18n Management',
              to: '/core/i18n',
            },
          ],
        },
        component: () => import('@/modules/core/i18n/views/Edit.vue'),
      },
    ],
  },
]
export default moduleRoute
