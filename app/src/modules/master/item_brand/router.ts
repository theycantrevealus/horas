const moduleRoute = [
  {
    path: '/master/item/brand',
    name: 'MasterItemBrand',
    component: () =>
      import(
        /* webpackChunkName: "master_item_brand" */ '@/modules/master/item_brand/Module.vue'
        ),
    meta: {
      pageTitle: 'Master Item Brand Management Builder',
      requiresAuth: true,
      breadcrumb: [
        {
          label: 'Master Item Brand',
          to: '/master/item/brdan',
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
              label: 'Master Item Brand',
              to: '/master/item/brand',
            },
          ],
        },
        component: () =>
          import(
            /* webpackChunkName: "master_item_brand" */ '@/modules/master/item_brand/views/Index.vue'
            ),
      },
    ],
  },
]

export default moduleRoute
