const moduleRoute = [
  {
    path: '/service',
    name: 'Service',
    component: () =>
      import(/* webpackChunkName: "service" */ '../service/Module.vue'),
    meta: {
      pageTitle: 'Service Management Builder',
      requiresAuth: true,
      breadcrumb: [
        {
          label: 'Service',
          to: '/service',
        },
      ],
    },
    children: [
      {
        path: 'list',
        name: 'ServiceList',
        meta: {
          pageTitle: 'Service Management',
          requiresAuth: true,
          breadcrumb: [
            {
              label: 'Service',
              to: '/service',
            },
          ],
        },
        component: () =>
          import(
            /* webpackChunkName: "service" */ '../service/views/Index.vue'
          ),
      },
      {
        path: 'add',
        name: 'ServiceAdd',
        meta: {
          pageTitle: 'Service Add',
          requiresAuth: true,
          breadcrumb: [
            {
              label: 'Service',
              to: '/service',
            },
          ],
        },
        component: () =>
          import(
            /* webpackChunkName: "service" */ '@/modules/service/views/Add.vue'
          ),
      },
      {
        path: 'edit/:id',
        name: 'ServiceEdit',
        meta: {
          pageTitle: 'Service Edit',
          requiresAuth: true,
          breadcrumb: [
            {
              label: 'Service',
              to: '/service',
            },
          ],
        },
        component: () =>
          import(
            /* webpackChunkName: "service" */ '@/modules/service/views/Edit.vue'
          ),
      },
    ],
  },
]

export default moduleRoute
