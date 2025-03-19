import './assets/main.css'
import PrimeVue from 'primevue/config'
import Aura from '@primevue/themes/aura'

import { createApp } from 'vue'
// import { createI18n } from 'vue-i18n'
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
// import { Ckeditor } from '@ckeditor/ckeditor5-vue'
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
import LOV from '@/modules/master/lov'
import type { RouteRecordRaw } from 'vue-router'
import { setupI18n } from '@/utils/core/i18n.ts'

const app = createApp(App)

const router = setUpRouter()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Modules: any = {
  lov: LOV,
}

Object.keys(Modules).forEach((moduleKey) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const module: any = Modules[moduleKey]
  module.router.forEach((item: RouteRecordRaw) => {
    router.addRoute('Builder', item)
  })
})

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)
// const i18n = createI18n({
//   locale: window.navigator.language.toString(),
//   fallbackLocale: 'en',
//   silentTranslationWarn: true
// })

const i18n = setupI18n({
  locale: window.navigator.language.toString(),
  fallbackLocale: 'en',
  silentTranslationWarn: true,
})

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
