import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
import store from '@/store/index'
import Builder from '@/views/Builder.vue'
import Login from '@/views/Account/Login.vue'
import PageNotFound from '@/views/Handling/404.vue'
import PageUnauthorized from '@/views/Handling/403.vue'

const NProgress = require('nprogress')
const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    name: 'Builder',
    component: Builder,
    meta: {
      requiresAuth: true,
    },
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        meta: {
          pageTitle: 'Dashboard',
          requiresAuth: true,
        },
        component: () =>
          import(/* webpackChunkName: "dashboard" */ '../views/Dashboard.vue'),
      },
      {
        path: 'about',
        name: 'About',
        meta: {
          pageTitle: 'About',
          requiresAuth: true,
          breadcrumb: [
            {
              label: 'About',
              to: '/about',
            },
          ],
        },
        component: () =>
          import(/* webpackChunkName: "about" */ '@/views/About.vue'),
      },
      {
        path: '/core',
        name: 'Core',
        children: [
          {
            path: 'menu',
            name: 'Menu',
            meta: {
              pageTitle: 'Menu Management',
              requiresAuth: true,
              breadcrumb: [
                {
                  label: 'Menu',
                  to: 'menu',
                },
              ],
            },
            component: () =>
              import(
                /* webpackChunkName: "menu.list" */ '@/views/Core/Menu.vue'
              ),
          },
        ],
        component: () =>
          import(/* webpackChunkName: "menu" */ '@/views/Core/Index.vue'),
      },
    ],
  },
  {
    path: '/login',
    name: 'Login',
    meta: {
      requiresAuth: false,
    },
    component: Login,
  },
  {
    path: '/404',
    name: 'PageNotFound',
    meta: {
      requiresAuth: false,
    },
    component: PageNotFound,
  },
  {
    path: '/403',
    name: 'PageUnauthorized',
    meta: {
      requiresAuth: true,
    },
    component: PageUnauthorized,
  },
]

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    }
    if (to.hash) {
      return { el: to.hash, behavior: 'smooth' }
    } else {
      return { el: '#content-loader', top: 0 }
    }
  },
})

router.beforeEach((to, from, next) => {
  NProgress.start()

  if (to.matched.some((record) => record.meta.requiresAuth)) {
    const isAuthed =
      (<any>store.state).credential.token !== '' &&
      (<any>store.state).credential.token !== null &&
      (<any>store.state).credential.token !== undefined

    if (isAuthed) {
      if (!to.matched.length) {
        next('/403')
      } else {
        next()
        return
      }
    } else {
      next('/login')
      return
    }
  } else {
    if (!to.matched.length) {
      next('/404')
    } else {
      next()
    }
  }

  // if (!to.matched.length) {
  //   alert('Not match')
  //   next('/404')
  // } else {
  //   if (to.matched.some((record) => record.meta.requiresAuth)) {
  //     if (isAuthed) {
  //       if ((<any>store.state).credential.routes.indexOf(to.name) < 0) {
  //         alert('Not auth')
  //         next('/403')
  //       } else {
  //         alert('Allowed')
  //         // alert()
  //         next()
  //       }
  //       return
  //     }
  //     if (to.name !== 'Login') next('/login')
  //   } else {
  //     if (isAuthed && to.matched.some((record) => record.path === '/login')) {
  //       // next('/dashboard')
  //       next
  //     } else {
  //       alert('Where')
  //       next()
  //     }
  //   }
  // }
})

router.afterEach(() => {
  NProgress.done()
})

export default router
