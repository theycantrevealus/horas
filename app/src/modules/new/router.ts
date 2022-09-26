const moduleRoute = [
  {
    path: '/new',
    name: 'New Page',
    component: () =>
      import(/* webpackChunkName: "new_page" */ '@/modules/new/Module.vue'),
    meta: {
      pageTitle: 'New Page for Sampling',
      requiresAuth: true,
      breadcrumb: [
        {
          label: 'New Page',
          to: '/new',
        },
      ],
    },
    children: [
      {
        path: '',
        name: 'NewPageList',
        meta: {
          pageTitle: 'New Page for Sampling',
          requiresAuth: true,
          breadcrumb: [
            {
              label: 'New Page',
              to: '/new',
            },
          ],
        },
        component: () =>
          import(
            /* webpackChunkName: "new_page" */ '@/modules/new/views/Index.vue'
          ),
      },
      {
        path: 'add',
        name: 'NewPageChild',
        meta: {
          pageTitle: 'New Page Child',
          requiresAuth: true,
          breadcrumb: [
            {
              label: 'New Page Child',
              to: '/new/child',
            },
          ],
        },
        component: () =>
          import(
            /* webpackChunkName: "new_page" */ '@/modules/new/views/Child.vue'
          ),
      },
    ],
  },
]

export default moduleRoute
