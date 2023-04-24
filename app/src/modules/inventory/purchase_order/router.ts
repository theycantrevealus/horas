const moduleName = 'PurchaseOrder'
const moduleCaption = 'Purchase Order'
const moduleUrl = '/inventory/purchase_order'
const moduleTarget = '@/modules/inventory/purchase_order'
const moduleRoute = [
  {
    path: `${moduleUrl}`,
    name: `${moduleName}`,
    component: () =>
      import(
        /* webpackChunkName: "purchase_order" */ `@/modules/inventory/purchase_order/Module.vue`
        ),
    meta: {
      pageTitle: `${moduleCaption} Builder`,
      requiresAuth: true,
      breadcrumb: [
        {
          label: `${moduleCaption}`,
          to: `${moduleUrl}`,
        },
      ],
    },
    children: [
      {
        path: '',
        name: `${moduleName}`,
        meta: {
          pageTitle: `${moduleCaption} Management`,
          requiresAuth: true,
          breadcrumb: [
            {
              label: moduleCaption,
              to: `${moduleUrl}`,
            },
          ],
        },
        component: () =>
          import(
            /* webpackChunkName: "purchase_order" */ `@/modules/inventory/purchase_order/views/Index.vue`
            ),
      },
      {
        path: 'add',
        name: `${moduleName}Add`,
        meta: {
          pageTitle: `${moduleCaption} Add`,
          requiresAuth: true,
          breadcrumb: [
            {
              label: `${moduleCaption}`,
              to: `${moduleUrl}`,
            },
            {
              label: `${moduleCaption} Add`,
              to: ``,
            },
          ],
        },
        component: () =>
          import(
            /* webpackChunkName: "purchase_order" */ `@/modules/inventory/purchase_order/views/Add.vue`
            ),
      },
      {
        path: 'edit/:id',
        name: `${moduleCaption}Edit`,
        meta: {
          pageTitle: `${moduleCaption} Edit`,
          requiresAuth: true,
          breadcrumb: [
            {
              label: `${moduleCaption}`,
              to: `${moduleUrl}`,
            },
          ],
        },
        component: () =>
          import(
            /* webpackChunkName: "purchase_order" */ `@/modules/inventory/purchase_order/views/Edit.vue`
            ),
      },
    ],
  },
]

export default moduleRoute
