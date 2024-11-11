import router from '../router/index'
import store from '../store/index'

const registerModule = (name, module: any) => {
  if (module.store) {
    store.registerModule(name, module.store)
  }

  if (module.router) {
    module.router.forEach(item => {
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
