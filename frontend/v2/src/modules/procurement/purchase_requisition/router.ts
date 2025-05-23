import type { RouteRecordRaw } from 'vue-router'

const moduleRoute: RouteRecordRaw[] = [
  {
    path: '/procurement/purchase_requisition',
    name: 'PurchaseRequisitionBuilder',
    component: () => import('@/modules/procurement/purchase_requisition/Module.vue'),
    meta: {
      pageTitle: 'Purchase Requisition Builder',
      requiresAuth: true,
      breadcrumb: [
        {
          label: 'Purchase Requisition',
          to: '/procurement/purchase_requisition',
        },
      ],
    },
    children: [
      {
        path: '',
        name: 'PurchaseRequisition',
        meta: {
          pageTitle: 'Purchase Requisition Management',
          requiresAuth: true,
          breadcrumb: [
            {
              label: 'PurchaseRequisition',
              to: '/procurement/purchase_requisition',
            },
          ],
        },
        component: () => import('@/modules/procurement/purchase_requisition/views/Index.vue'),
      },
      {
        path: 'add/:id',
        name: 'PurchaseRequisitionAdd',
        meta: {
          pageTitle: 'Add Purchase Requisition',
          requiresAuth: true,
          breadcrumb: [
            {
              label: 'Purchase Requisition Management',
              to: '/procurement/purchase_requisition',
            },
          ],
        },
        component: () => import('@/modules/procurement/purchase_requisition/views/Add.vue'),
      },
      {
        path: 'edit/:id',
        name: 'PurchaseRequisitionEdit',
        meta: {
          pageTitle: 'Edit Purchase Requisition',
          requiresAuth: true,
          breadcrumb: [
            {
              label: 'Purchase Requisition Management',
              to: '/procurement/purchase_requisition',
            },
          ],
        },
        component: () => import('@/modules/procurement/purchase_requisition/views/Edit.vue'),
      },
    ],
  },
]
export default moduleRoute
