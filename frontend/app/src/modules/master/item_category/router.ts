const moduleRoute = [
  {
    path: '/master/item/category',
    name: 'MasterItemCategory',
    component: () =>
      import(
        /* webpackChunkName: "master_item_category" */ '@/modules/master/item_category/Module.vue'
        ),
    meta: {
      pageTitle: 'Master Item Category Management Builder',
      requiresAuth: true,
      breadcrumb: [
        {
          label: 'Master Item Category',
          to: '/master/item/category',
        },
      ],
    },
    children: [
      {
        path: '',
        name: 'MasterItemCategoryChild',
        meta: {
          pageTitle: 'Master Item Category Management',
          requiresAuth: true,
          breadcrumb: [
            {
              label: 'Master Item Category',
              to: '/master/item/category',
            },
          ],
        },
        component: () =>
          import(
            /* webpackChunkName: "master_item_category" */ '@/modules/master/item_category/views/Index.vue'
            ),
      },
    ],
  },
]

export default moduleRoute
