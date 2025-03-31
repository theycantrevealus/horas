import type { RouteRecordRaw } from 'vue-router'

const moduleRoute: RouteRecordRaw[] = [
  {
    path: '/core/menu',
    name: 'MasterMenuBuilder',
    component: () => import('@/modules/core/menu/Module.vue'),
    meta: {
      pageTitle: 'Menu Management Builder',
      requiresAuth: true,
      breadcrumb: [
        {
          label: 'Menu Management',
          to: '/menu',
        },
      ],
    },
    children: [
      {
        path: '',
        name: 'Menu',
        meta: {
          pageTitle: 'Menu Management',
          requiresAuth: true,
          breadcrumb: [
            {
              label: 'Menu Management',
              to: '/menu',
            },
          ],
        },
        component: () => import('@/modules/core/menu/views/Index.vue'),
      },
    ],
  },
]
export default moduleRoute
