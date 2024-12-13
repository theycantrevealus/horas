const moduleRoute = [
  {
    path: '/lov',
    name: 'Lov',
    component: () =>
      import(
        /* webpackChunkName: "lov" */ '@/modules/lov/Module.vue'
        ),
    meta: {
      pageTitle: 'LOV Management Builder',
      requiresAuth: true,
      breadcrumb: [
        {
          label: 'LOV',
          to: '/lov',
        },
      ],
    },
    children: [
      {
        path: '',
        name: 'LOV',
        meta: {
          pageTitle: 'LOV Management',
          requiresAuth: true,
          breadcrumb: [
            {
              label: 'LOV',
              to: '/lov',
            },
          ],
        },
        component: () =>
          import(
            /* webpackChunkName: "lov" */ '@/modules/lov/views/Index.vue'
            ),
      },
    ],
  },
]

export default moduleRoute
