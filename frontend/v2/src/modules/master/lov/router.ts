import type { RouteRecordRaw } from 'vue-router'

const moduleRoute: RouteRecordRaw[] = [
  {
    path: '/lov',
    name: 'LOVBuilder',
    component: () => import('@/modules/master/lov/Module.vue'),
    meta: {
      pageTitle: 'LOV Management Builder',
      requiresAuth: true,
      breadcrumb: [
        {
          label: 'LOV',
          to: '/lov',
        },
      ],
    },
    children: [
      {
        path: '',
        name: 'LOV',
        meta: {
          pageTitle: 'LOV Management',
          requiresAuth: true,
          breadcrumb: [
            {
              label: 'LOV',
              to: '/lov',
            },
          ],
        },
        component: () => import('@/modules/master/lov/views/Index.vue'),
      },
    ],
  },
]
export default moduleRoute
