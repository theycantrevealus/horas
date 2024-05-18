import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
import store from '@/store/index'
import Builder from '@/views/Builder.vue'
import Login from '@/views/Account/Login.vue'
import PageNotFound from '@/views/Handling/404.vue'
import PageUnauthorized from '@/views/Handling/403.vue'
import * as NProgress from 'nprogress'
import process from 'process'

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    name: 'Builder',
    component: Builder,
    meta: {
      requiresAuth: false,
    },
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        meta: {
          pageTitle: 'Dashboard',
          requiresAuth: false,
        },
        component: () =>
          import(/* webpackChunkName: "dashboard" */ '../views/Dashboard.vue'),
      },
      {
        path: 'about',
        name: 'About',
        meta: {
          pageTitle: 'About',
          requiresAuth: false,
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
              requiresAuth: false,
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
      requiresAuth: false,
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
      return { el: '#content-loader', top: 0, left: 0 }
    }
  },
})

router.beforeEach((to, from, next) => {
  store.commit('storeApplication/Mutation___toggleSideMenuOff')
  NProgress.start()
  if (to.matched.some((record) => record.meta.requiresAuth)) {
    const token = store.getters['storeCredential/Getter___token']
    const isAuthed = token &&token !== '' && token !== null

    if (isAuthed) {
      if (!to.matched.length) {
        next('/404')
      } else {
        // next()
        // return
        if(to.name) {
          if(
            store.getters['storeCredential/Getter___credential'].routes.indexOf(to.name.toString()) < 0
          ) {
            if(store.getters['storeCredential/Getter___credential'].routeMap[to.name.toString()]) {
              const dispatches = store.getters['storeCredential/Getter___credential'].routeMap[to.name.toString()].permission
              if(dispatches && dispatches.indexOf(to.name.toString()) < 0) {
                alert()
                next({
                  path: '/403',
                  query: {
                    from: from.fullPath
                  }
                })
              } else {
                next()
                return
              }
            } else {
              alert()
              next({
                path: '/403',
                query: {
                  from: from.fullPath
                }
              })
            }
          } else {
            next()
            return
          }
        } else {
          next('/404')
        }
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
})

router.afterEach(() => {
  NProgress.done()
})

export default router
