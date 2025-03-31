import type { RouteRecordRaw } from 'vue-router'

const moduleRoute: RouteRecordRaw[] = [
  {
    path: '/master/item/brand',
    name: 'MasterItemBrandBuilder',
    component: () => import('@/modules/master/item/brand/Module.vue'),
    meta: {
      pageTitle: 'Master Item Brand Management Builder',
      requiresAuth: true,
      breadcrumb: [
        {
          label: 'Master Item Brand',
          to: '/master/item/brand',
        },
      ],
    },
    children: [
      {
        path: '',
        name: 'MasterItemBrand',
        meta: {
          pageTitle: 'Master Item Brand Management',
          requiresAuth: true,
          breadcrumb: [
            {
              label: 'MasterItemBrand',
              to: '/master/item/brand',
            },
          ],
        },
        component: () => import('@/modules/master/item/brand/views/Index.vue'),
      },
    ],
  },
]
export default moduleRoute
