import type { RouteRecordRaw } from 'vue-router'

const moduleRoute: RouteRecordRaw[] = [
  {
    path: '/procurement/purchase_order',
    name: 'PurchaseOrderBuilder',
    component: () => import('@/modules/procurement/purchase_order/Module.vue'),
    meta: {
      pageTitle: 'Purchase Order Builder',
      requiresAuth: true,
      breadcrumb: [
        {
          label: 'Purchase Order',
          to: '/procurement/purchase_order',
        },
      ],
    },
    children: [
      {
        path: '',
        name: 'PurchaseOrder',
        meta: {
          pageTitle: 'Purchase Order Management',
          requiresAuth: true,
          breadcrumb: [
            {
              label: 'PurchaseOrder',
              to: '/procurement/purchase_order',
            },
          ],
        },
        component: () => import('@/modules/procurement/purchase_order/views/Index.vue'),
      },
      {
        path: 'add/:id',
        name: 'PurchaseOrderAdd',
        meta: {
          pageTitle: 'Add Purchase Order',
          requiresAuth: true,
          breadcrumb: [
            {
              label: 'Purchase Order Management',
              to: '/procurement/purchase_order',
            },
          ],
        },
        component: () => import('@/modules/procurement/purchase_order/views/Add.vue'),
      },
      {
        path: 'edit/:id',
        name: 'PurchaseOrderEdit',
        meta: {
          pageTitle: 'Edit Purchase Order',
          requiresAuth: true,
          breadcrumb: [
            {
              label: 'Purchase Order Management',
              to: '/procurement/purchase_order',
            },
          ],
        },
        component: () => import('@/modules/procurement/purchase_order/views/Edit.vue'),
      },
    ],
  },
]
export default moduleRoute
