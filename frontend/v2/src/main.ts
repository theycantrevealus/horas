import './assets/main.css'
import PrimeVue from 'primevue/config'
import Aura from '@primevue/themes/aura'

import { createApp } from 'vue'
import { createI18n } from 'vue-i18n'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import App from './App.vue'
import router from '@/router'
import { registerModules } from '@/utils/core/module.register.ts'

import 'primeicons/primeicons.css'
import 'primeflex/primeflex.css'
import 'primeflex/themes/primeone-light.css'
import ToastService from 'primevue/toastservice'
import ConfirmationService from 'primevue/confirmationservice'
import DialogService from 'primevue/dialogservice'
import Tooltip from 'primevue/tooltip'
// import 'material-icons/iconfont/material-icons.css'
import { Ckeditor } from '@ckeditor/ckeditor5-vue'
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

const app = createApp(App)

registerModules({
  lov: LOV
})

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)
const i18n = createI18n({
  locale: window.navigator.language.toString(),
  fallbackLocale: 'en',
  silentTranslationWarn: true
})

app.use(pinia)
  .use(router)
  .use(i18n)
  .use(PrimeVue, {
    theme: {
      preset: Aura
    }
  })
  .use(ToastService)
  .use(ConfirmationService)
  .use(DialogService)
  .directive('tooltip', Tooltip)
  .mount('#app')
