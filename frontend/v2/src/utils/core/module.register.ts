import setUpRouter from '@/router'
import type { RouteRecordRaw } from 'vue-router'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const registerModules = (modules: any) => {
  Object.keys(modules).forEach((moduleKey) => {
    const module = modules[moduleKey]
    module.router.forEach((item: RouteRecordRaw) => {
      setUpRouter().addRoute('Builder', item)
    })
    // registerModule(moduleKey, module)
  })
}
