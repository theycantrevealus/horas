const moduleName = 'GeneralReceiveNote'
const moduleCaption = 'General Receive Note'
const moduleUrl = '/inventory/general_receive_note'
const moduleTarget = '@/modules/inventory/general_receive_note'
const moduleRoute = [
  {
    path: `${moduleUrl}`,
    name: `${moduleName}`,
    component: () =>
      import(
        /* webpackChunkName: "general_receive_note" */ `@/modules/inventory/general_receive_note/Module.vue`
        ),
    meta: {
      pageTitle: `${moduleCaption} Builder`,
      requiresAuth: true,
      breadcrumb: [
        {
          label: `${moduleCaption}`,
          to: `${moduleUrl}`,
        },
      ],
    },
    children: [
      {
        path: '',
        name: `${moduleName}`,
        meta: {
          pageTitle: `${moduleCaption} Management`,
          requiresAuth: true,
          breadcrumb: [
            {
              label: moduleCaption,
              to: `${moduleUrl}`,
            },
          ],
        },
        component: () =>
          import(
            /* webpackChunkName: "general_receive_note" */ `@/modules/inventory/general_receive_note/views/Index.vue`
            ),
      },
      {
        path: 'add/:id',
        name: `${moduleName}Add`,
        meta: {
          pageTitle: `${moduleCaption} Add`,
          requiresAuth: true,
          breadcrumb: [
            {
              label: `${moduleCaption}`,
              to: `${moduleUrl}`,
            },
          ],
        },
        component: () =>
          import(
            /* webpackChunkName: "general_receive_note" */ `@/modules/inventory/general_receive_note/views/Add.vue`
            ),
      },
    ],
  },
]

export default moduleRoute
