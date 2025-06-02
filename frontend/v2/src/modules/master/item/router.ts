import type { RouteRecordRaw } from 'vue-router'

const moduleRoute: RouteRecordRaw[] = [
  {
    path: '/master/item',
    name: 'MasterItemBuilder',
    component: () => import('@/modules/master/item/Module.vue'),
    meta: {
      pageTitle: 'Master Item Management Builder',
      requiresAuth: true,
      breadcrumb: [
        {
          label: 'Master Item',
          to: '/master/item',
        },
      ],
    },
    children: [
      {
        path: '',
        name: 'MasterItem',
        meta: {
          pageTitle: 'Master Item Management',
          requiresAuth: true,
          breadcrumb: [
            {
              label: 'MasterItem',
              to: '/master/item',
            },
          ],
        },
        component: () => import('@/modules/master/item/views/Index.vue'),
      },
      {
        path: 'add',
        name: 'MasterItemAdd',
        meta: {
          pageTitle: 'Add Master Item',
          requiresAuth: true,
          breadcrumb: [
            {
              label: 'Master Item Management',
              to: '/master/item',
            },
          ],
        },
        component: () => import('@/modules/master/item/views/Add.vue'),
      },
      {
        path: 'edit/:id',
        name: 'MasterItemEdit',
        meta: {
          pageTitle: 'Edit Master Item',
          requiresAuth: true,
          breadcrumb: [
            {
              label: 'Master Item Management',
              to: '/master/item',
            },
          ],
        },
        component: () => import('@/modules/master/item/views/Edit.vue'),
      },
    ],
  },
]
export default moduleRoute
