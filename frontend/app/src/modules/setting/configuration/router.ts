const moduleName = 'ApplicationConfiguration'
const moduleCaption = 'Application Configuration'
const moduleUrl = '/application'
const moduleTarget = '@/modules/setting/configuration'
const moduleRoute = [
  {
    path: `${moduleUrl}`,
    name: `${moduleName}`,
    component: () =>
      import(
        /* webpackChunkName: "application_configuration" */ `@/modules/setting/configuration/Module.vue`
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
        name: `${moduleName}Child`,
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
            /* webpackChunkName: "application_configuration" */ `@/modules/setting/configuration/views/Index.vue`
            ),
      },
    ],
  },
]

export default moduleRoute
