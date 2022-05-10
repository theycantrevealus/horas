const moduleRoute = [{
  path: '/kuisioner',
  name: 'Kuisioner',
  component: () => import(/* webpackChunkName: "master_kuiosioner" */ '@/modules/master/kuisioner/Module.vue'),
  meta: {
    pageTitle: 'Master Kuisioner Management Builder',
    requiresAuth: true,
    breadcrumb: [
      {
        label: 'Master Kuisioner',
        to: '/kuisioner'
      }
    ]
  },
  children: [
    {
      path: '',
      name: 'MasterKuisioner',
      meta: {
        pageTitle: 'Master Kuisioner Management',
        requiresAuth: true,
        breadcrumb: [
          {
            label: 'Master Kuisioner',
            to: '/kuisioner'
          }
        ]
      },
      component: () => import(/* webpackChunkName: "master_kuiosioner" */ '@/modules/master/kuisioner/views/Index.vue')
    },
    {
      path: 'add',
      name: 'MasterKuisionerAdd',
      meta: {
        pageTitle: 'Master Kuisioner Add',
        requiresAuth: true,
        breadcrumb: [
          {
            label: 'Master Kuisioner',
            to: '/kuisioner/list'
          }
        ]
      },
      component: () => import(/* webpackChunkName: "master_kuiosioner" */ '@/modules/master/kuisioner/views/Add.vue')
    },
    {
      path: 'edit/:uid',
      name: 'AccountAuthorityEdit',
      meta: {
        pageTitle: 'Master Kuisioner Edit',
        requiresAuth: true,
        breadcrumb: [
          {
            label: 'Master Kuisioner',
            to: '/kuisioner'
          }
        ]
      },
      component: () => import(/* webpackChunkName: "master_kuiosioner" */ '@/modules/master/kuisioner/views/Edit.vue')
    }
  ]
}]

export default moduleRoute
