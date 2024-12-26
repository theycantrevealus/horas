import router from '@/router'
import type { RouteRecordRaw } from 'vue-router'

const registerModule = (name: string, module: any) => {
  // No need to register on pinia
  // if (module.store) {
  //   store.registerModule(name, module.store)
  // }

  if (module.router) {
    module.router.forEach((item:RouteRecordRaw) => {
      router.addRoute('Builder', item)
    })
  }
}

export const registerModules = (modules: any) => {
  Object.keys(modules).forEach(moduleKey => {
    const module = modules[moduleKey]
    registerModule(moduleKey, module)
  })
}
