const moduleName = 'Purchase Order'
const moduleUrl = '/inventory/purchase_order'
const moduleTarget = '@/modules/inventory/purchase_order'
const moduleRoute = [
  {
    path: `/inventory/${moduleUrl}`,
    name: moduleName,
    component: () =>
      import(
        /* webpackChunkName: "purchase_order" */ `${moduleTarget}/Module.vue`
        ),
    meta: {
      pageTitle: `${moduleName} Builder`,
      requiresAuth: true,
      breadcrumb: [
        {
          label: `${moduleName}`,
          to: `${moduleUrl}`,
        },
      ],
    },
    children: [
      {
        path: '',
        name: `${moduleName} List`,
        meta: {
          pageTitle: `${moduleName} Management`,
          requiresAuth: true,
          breadcrumb: [
            {
              label: moduleName,
              to: `${moduleUrl}`,
            },
          ],
        },
        component: () =>
          import(
            /* webpackChunkName: "purchase_order" */ `${moduleTarget}/views/Index.vue`
            ),
      },
      {
        path: 'add',
        name: `${moduleName} Add`,
        meta: {
          pageTitle: `${moduleName} Add`,
          requiresAuth: true,
          breadcrumb: [
            {
              label: `${moduleName}`,
              to: `${moduleUrl}`,
            },
          ],
        },
        component: () =>
          import(
            /* webpackChunkName: "purchase_order" */ `${moduleTarget}/views/Add.vue`
            ),
      },
      {
        path: 'edit/:id',
        name: `${moduleName} Edit`,
        meta: {
          pageTitle: `${moduleName} Edit`,
          requiresAuth: true,
          breadcrumb: [
            {
              label: `${moduleName}`,
              to: `${moduleUrl}`,
            },
          ],
        },
        component: () =>
          import(
            /* webpackChunkName: "purchase_order" */ `${moduleTarget}/views/Edit.vue`
            ),
      },
    ],
  },
]

export default moduleRoute
