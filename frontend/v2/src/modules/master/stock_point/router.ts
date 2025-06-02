import type { RouteRecordRaw } from 'vue-router'

const moduleRoute: RouteRecordRaw[] = [
  {
    path: '/master/stock_point',
    name: 'MasterStockPointBuilder',
    component: () => import('@/modules/master/stock_point/Module.vue'),
    meta: {
      pageTitle: 'Master Stock Point Management Builder',
      requiresAuth: true,
      breadcrumb: [
        {
          label: 'Stock Point Management',
          to: '/master/stock_point',
        },
      ],
    },
    children: [
      {
        path: '',
        name: 'MasterStockPoint',
        meta: {
          pageTitle: 'Master Stock Point Management',
          requiresAuth: true,
          breadcrumb: [
            {
              label: 'Master Stock Point Management',
              to: '/master/stock_point',
            },
          ],
        },
        component: () => import('@/modules/master/stock_point/views/Index.vue'),
      },
      {
        path: 'add',
        name: 'MasterStockPointAdd',
        meta: {
          pageTitle: 'Add New Account',
          requiresAuth: true,
          breadcrumb: [
            {
              label: 'Account Management',
              to: '/master/stock_point',
            },
          ],
        },
        component: () => import('@/modules/master/stock_point/views/Add.vue'),
      },
      {
        path: 'edit/:id',
        name: 'MasterStockPointEdit',
        meta: {
          pageTitle: 'Edit Account',
          requiresAuth: true,
          breadcrumb: [
            {
              label: 'Account Management',
              to: '/master/stock_point',
            },
          ],
        },
        component: () => import('@/modules/master/stock_point/views/Edit.vue'),
      },
    ],
  },
]
export default moduleRoute
