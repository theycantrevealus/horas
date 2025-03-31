const moduleRoute = [
  {
    path: '/get_started',
    name: 'GetStarted',
    component: () =>
      import(
        /* webpackChunkName: "get_started" */ '@/modules/get_started/Module.vue'
      ),
    meta: {
      pageTitle: 'Get Started',
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
        name: 'GetStartedIndex',
        meta: {
          pageTitle: 'Get Started',
          requiresAuth: true,
          breadcrumb: [
            {
              label: 'Get Started',
              to: '/get_started',
            },
          ],
        },
        component: () =>
          import(
            /* webpackChunkName: "get_started" */ '@/modules/get_started/views/Index.vue'
          ),
      },
    ],
  },
]

export default moduleRoute
