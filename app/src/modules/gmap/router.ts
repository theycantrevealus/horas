const moduleRoute = [{
  path: '/gmap',
  name: 'GMap Integration',
  component: () => import(/* webpackChunkName: "master_item" */ '@/modules/gmap/Module.vue'),
  meta: {
    pageTitle: 'GMap',
    requiresAuth: true,
    breadcrumb: [
      {
        label: 'GMap',
        to: '/gmap'
      }
    ]
  },
  children: [
    {
      path: '',
      name: 'GMap',
      meta: {
        pageTitle: 'GMap',
        requiresAuth: true,
        breadcrumb: [
          {
            label: 'Gmap',
            to: '/gmap'
          }
        ]
      },
      component: () => import(/* webpackChunkName: "master_item" */ '@/modules/gmap/views/Index.vue')
    }
  ]
}]

export default moduleRoute
