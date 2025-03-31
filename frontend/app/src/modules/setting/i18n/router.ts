const moduleRoute = [
  {
    path: '/setting/i18n',
    name: 'i18n',
    component: () =>
      import(
        /* webpackChunkName: "i18n" */ '@/modules/setting/i18n/Module.vue'
      ),
    meta: {
      pageTitle: 'i18n Management',
      requiresAuth: true,
      breadcrumb: [
        {
          label: 'i18n Management',
          to: '/setting/i18n',
        },
      ],
    },
    children: [
      {
        path: '',
        name: 'i18nChild',
        meta: {
          pageTitle: 'i18n Management',
          requiresAuth: true,
          breadcrumb: [
            {
              label: 'i18n Management',
              to: '/setting/i18n',
            },
          ],
        },
        component: () =>
          import(
            /* webpackChunkName: "i18n" */ '@/modules/setting/i18n/views/Index.vue'
          ),
      },
      {
        path: 'add',
        name: 'i18nAdd',
        meta: {
          pageTitle: 'New i18n',
          requiresAuth: true,
          breadcrumb: [
            {
              label: 'i18n Management',
              to: '/setting/i18n',
            },
          ],
        },
        component: () =>
          import(
            /* webpackChunkName: "i18n" */ '@/modules/setting/i18n/views/Add.vue'
          ),
      },
      {
        path: 'edit/:id',
        name: 'i18nEdit',
        meta: {
          pageTitle: 'i18n Edit',
          requiresAuth: true,
          breadcrumb: [
            {
              label: 'Edit i18n',
              to: '/setting/i18n',
            },
          ],
        },
        component: () =>
          import(
            /* webpackChunkName: "i18n" */ '@/modules/setting/i18n/views/Edit.vue'
          ),
      },
    ],
  },
]

export default moduleRoute
