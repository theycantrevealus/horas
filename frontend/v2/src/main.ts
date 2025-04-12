import './assets/main.css'
import PrimeVue from 'primevue/config'
import Aura from '@primevue/themes/aura'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import App from './App.vue'
import setUpRouter from '@/router'

import 'primeicons/primeicons.css'
import 'primeflex/primeflex.css'
import 'primeflex/themes/primeone-light.css'
import ToastService from 'primevue/toastservice'
import ConfirmationService from 'primevue/confirmationservice'
import DialogService from 'primevue/dialogservice'
import Tooltip from 'primevue/tooltip'
// import 'material-icons/iconfont/material-icons.css'
import '@material-design-icons/font'
import '@material-design-icons/font/outlined.css'
import 'material-symbols'
import '@/assets/flag.css'
import '@/assets/style/popconfirm.css'
import '@/assets/style/toolbar.css'
import '@/assets/style/table.css'
import '@/assets/style/modal.css'
import '@/assets/style/light.css'
import '@/assets/style/sidepanel.css'
import '@/assets/tnsol.css'

// Module List
import Account from '@/modules/core/account'
import I18N from '@/modules/core/i18n'
import Menu from '@/modules/core/menu'
import LOV from '@/modules/master/lov'

import MasterItemBrand from '@/modules/master/item/brand'
import MasterItem from '@/modules/master/item'

import type { RouteRecordRaw } from 'vue-router'
import { i18n } from '@/utils/core/i18n.ts'

const app = createApp(App)

const router = setUpRouter()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Modules: any = {
  // Core Module
  account: Account,
  i18n: I18N,
  menu: Menu,

  // Master Module
  lov: LOV,
  masterItemBrand: MasterItemBrand,
  masterItem: MasterItem,
}

Object.keys(Modules).forEach(async (moduleKey) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const module: any = Modules[moduleKey]
  await module.router.forEach(async (item: RouteRecordRaw) => {
    router.addRoute('BuilderRouter', item)
  })
})

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

app
  .use(pinia)
  .use(router)
  .use(i18n)
  .use(PrimeVue, {
    theme: {
      preset: Aura,
    },
  })
  .use(ToastService)
  .use(ConfirmationService)
  .use(DialogService)
  .directive('tooltip', Tooltip)
  .mount('#app')
