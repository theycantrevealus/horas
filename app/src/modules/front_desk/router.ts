const requireAuth = false
const moduleRoute = [
  {
    path: '/front_desk',
    name: 'FrontDesk',
    component: () =>
      import(/* webpackChunkName: "front_desk" */ './Module.vue'),
    meta: {
      pageTitle: 'Front Desk Builder',
      requiresAuth: requireAuth,
      breadcrumb: [
        {
          label: 'FrontDesk',
          to: '/front_desk',
        },
      ],
    },
    children: [
      {
        path: '',
        name: 'FrontDesk',
        meta: {
          pageTitle: 'Front Desk Builder',
          requireAuth: requireAuth,
          breadcrumb: [
            {
              label: 'FrontDesk',
              to: '/front_desk/list',
            },
          ],
        },
        component: () =>
          import(/* webpackChunkName: "front_desk" */ './view/Index.vue'),
      },
    ],
  },
]

export default moduleRoute
