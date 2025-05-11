import type { RouteRecordRaw } from 'vue-router'

const moduleRoute: RouteRecordRaw[] = [
  {
    path: '/inventory/material_requisition',
    name: 'MaterialRequisitionBuilder',
    component: () => import('@/modules/inventory/material_requisition/Module.vue'),
    meta: {
      pageTitle: 'Material Requisition Builder',
      requiresAuth: true,
      breadcrumb: [
        {
          label: 'Material Requisition',
          to: '/inventory/material_requisition',
        },
      ],
    },
    children: [
      {
        path: '',
        name: 'MaterialRequisition',
        meta: {
          pageTitle: 'Material Requisition Management',
          requiresAuth: true,
          breadcrumb: [
            {
              label: 'MaterialRequisition',
              to: '/inventory/material_requisition',
            },
          ],
        },
        component: () => import('@/modules/inventory/material_requisition/views/Index.vue'),
      },
      {
        path: 'add',
        name: 'MaterialRequisitionAdd',
        meta: {
          pageTitle: 'Add Material Requisition',
          requiresAuth: true,
          breadcrumb: [
            {
              label: 'Material Requisition Management',
              to: '/inventory/material_requisition',
            },
          ],
        },
        component: () => import('@/modules/inventory/material_requisition/views/Add.vue'),
      },
      {
        path: 'edit/:id',
        name: 'MaterialRequisitionEdit',
        meta: {
          pageTitle: 'Edit Material Requisition',
          requiresAuth: true,
          breadcrumb: [
            {
              label: 'Material Requisition Management',
              to: '/inventory/material_requisition',
            },
          ],
        },
        component: () => import('@/modules/inventory/material_requisition/views/Edit.vue'),
      },
    ],
  },
]
export default moduleRoute
