const moduleRoute = [
  {
    path: '/master/queue_machine',
    name: 'MasterQueueMachine',
    component: () =>
      import(
        /* webpackChunkName: "master_queue_machine" */ '@/modules/master/queue_machine/Module.vue'
        ),
    meta: {
      pageTitle: 'Master Queue Machine Management Builder',
      requiresAuth: true,
      breadcrumb: [
        {
          label: 'Master Queue Machine Category',
          to: '/master/queue_machine',
        },
      ],
    },
    children: [
      {
        path: '',
        name: 'MasterQueueMachine',
        meta: {
          pageTitle: 'Master Queue Machine Management',
          requiresAuth: true,
          breadcrumb: [
            {
              label: 'Master Queue Machine',
              to: '/master/queue_machine',
            },
          ],
        },
        component: () =>
          import(
            /* webpackChunkName: "master_queue_machine" */ '@/modules/master/queue_machine/views/Index.vue'
            ),
      },
    ],
  },
]

export default moduleRoute
