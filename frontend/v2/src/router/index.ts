import { createRouter, createWebHistory } from 'vue-router'
import { storeCore } from '@/store/index.ts'
// import * as NProgress from 'nprogress'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'dashboard',
      meta: {
        requiresAuth: true,
      },
      component: () => import('@/modules/core/Dashboard.vue'),
    },
    {
      path: '/login',
      name: 'Login',
      meta: {
        requiresAuth: false,
      },
      component: () => import('@/modules/core/login/Index.vue'),
    },
    {
      path: '/403',
      name: 'PermissionDenied',
      meta: {
        requiresAuth: false,
      },
      component: () => import('@/modules/core/403.vue'),
    },
    {
      path: '/404',
      name: 'NotFound',
      meta: {
        requiresAuth: false,
      },
      component: () => import('@/modules/core/404.vue'),
    }
  ],
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    }
    if (to.hash) {
      return { el: to.hash, behavior: 'smooth' }
    } else {
      return { el: '#content-loader', top: 0, left: 0 }
    }
  },
})

router.beforeEach((to, from, next) => {
  // NProgress.start()

  const store = storeCore()

  // Check if route exists
  if (!to.matched.length) {
    next('/404')
  } else {
    // Check if route need authentication
    if (to.matched.some((record) => record.meta.requiresAuth)) {

      // Check for token
      const token = store.getToken
      const isAuthed = token && token !== '' && token !== null
      if (isAuthed) {

        if(store.hasAccess(to.name?.toString() ?? '')) {

          next()
          return

        } else {

          next({
            path: '/403',
            query: {
              from: from.fullPath
            }
          })
          return

        }

      } else {
        next('/login')
        return
      }

    } else {
      // No need auth
      next()
    }
  }
})

router.afterEach(() => {
  // NProgress.done()
})

export default router
