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
      requiresAuth: true
    },
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        meta: {
          pageTitle: 'Dashboard',
          requiresAuth: true
        },
        component: () => import(/* webpackChunkName: "dashboard" */ '../views/Dashboard.vue')
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
              to: '/about'
            }
          ]
        },
        component: () => import(/* webpackChunkName: "about" */ '@/views/About.vue')
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
                  to: 'menu'
                }
              ]
            },
            component: () => import(/* webpackChunkName: "menu.list" */ '@/views/Core/Menu.vue')
          }
        ],
        component: () => import(/* webpackChunkName: "menu" */ '@/views/Core/Index.vue')
      }
    ]
  },
  {
    path: '/login',
    name: 'Login',
    component: Login
  },
  {
    path: '/404',
    name: 'PageNotFound',
    component: PageNotFound
  },
  {
    path: '/403',
    name: 'PageUnauthorized',
    component: PageUnauthorized
  }
]

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes,
  scrollBehavior (to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    }
    if (to.hash) {
      return { el: to.hash, behavior: 'smooth' }
    } else {
      return { el: '#content-loader', top: 0 }
    }
  }
})

router.beforeEach((to, from, next) => {
  NProgress.start()
  if (!to.matched.length) {
    next('/404')
  } else {
    const isAuthed = ((<any>store.state).credential.token !== '' && (<any>store.state).credential.token !== null && (<any>store.state).credential.token !== undefined)
    if (to.matched.some(record => record.meta.requiresAuth)) {
      if (isAuthed) {
        // Check If authorized Page
        // const authorized: string[] = store.state.credential.grantedPage
        // if (authorized.indexOf(to.fullPath) >= 0) {
        //   next()
        //   return
        // }
        // next('/403')
        // next()
        if ((<any>store.state).credential.routes.indexOf(to.name) < 0) {
          next('/403')
        } else {
          next()
        }
        return
      }
      next('/login')
    } else {
      if (isAuthed && to.matched.some(record => record.path === '/login')) {
        next('/dashboard')
      } else {
        next()
      }
    }
  }
})

router.afterEach(() => {
  NProgress.done()
})

export default router
