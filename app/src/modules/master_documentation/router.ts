const moduleRoute = [{
  path: '/master/documentation',
  name: 'Master Documentation',
  component: () => import(/* webpackChunkName: "master_documentation" */ '@/modules/master_documentation/Module.vue'),
  meta: {
    pageTitle: 'Master Documentation Management Builder',
    requiresAuth: true,
    breadcrumb: [
      {
        label: 'Master Documentation',
        to: '/master/documentation'
      }
    ]
  },
  children: [
    {
      path: '',
      name: 'Master Documentation List',
      meta: {
        pageTitle: 'Master Documentation Management',
        requiresAuth: true,
        breadcrumb: [
          {
            label: 'Master Documentation',
            to: '/master/documentation/'
          }
        ]
      },
      component: () => import(/* webpackChunkName: "master_documentation" */ '@/modules/master_documentation/views/Index.vue')
    },
    {
      path: 'add',
      name: 'Master Documentation Add',
      meta: {
        pageTitle: 'Master Documentation Add',
        requiresAuth: true,
        breadcrumb: [
          {
            label: 'Master Documentation',
            to: '/master/documentation/'
          }
        ]
      },
      component: () => import(/* webpackChunkName: "master_documentation" */ '@/modules/master_documentation/views/Add.vue')
    },
    {
      path: 'edit/:uid',
      name: 'Master DocumentationEdit',
      meta: {
        pageTitle: 'Master Documentation Edit',
        requiresAuth: true,
        breadcrumb: [
          {
            label: 'Master Documentation',
            to: '/master/documentation/'
          }
        ]
      },
      component: () => import(/* webpackChunkName: "master_documentation" */ '@/modules/master_documentation/views/Edit.vue')
    }
  ]
}]

export default moduleRoute
