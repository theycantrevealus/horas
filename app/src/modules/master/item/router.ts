const moduleRoute = [
  {
    path: '/master/item',
    name: 'MasterItem',
    component: () =>
      import(
        /* webpackChunkName: "master_item" */ '@/modules/master/item/Module.vue'
      ),
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
              label: 'Master Item',
              to: '/master/item/',
            },
          ],
        },
        component: () =>
          import(
            /* webpackChunkName: "master_item" */ '@/modules/master/item/views/Index.vue'
          ),
      },
      {
        path: 'add',
        name: 'MasterItemAdd',
        meta: {
          pageTitle: 'Master Item Add',
          requiresAuth: true,
          breadcrumb: [
            {
              label: 'Master Item',
              to: '/master/item/',
            },
          ],
        },
        component: () =>
          import(
            /* webpackChunkName: "master_item" */ '@/modules/master/item/views/Add.vue'
          ),
      },
      {
        path: 'edit/:id',
        name: 'MasterItemEdit',
        meta: {
          pageTitle: 'Master Item Edit',
          requiresAuth: true,
          breadcrumb: [
            {
              label: 'Master Item',
              to: '/master/item/',
            },
          ],
        },
        component: () =>
          import(
            /* webpackChunkName: "master_item" */ '@/modules/master/item/views/Edit.vue'
          ),
      },
    ],
  },
]

export default moduleRoute
