import { createApp } from 'vue'
import App from './App.vue'
import PrimeVue from 'primevue/config'
// import * as Sentry from '@sentry/vue'
// import { Integrations } from '@sentry/tracing'
import './registerServiceWorker'
import router from './router'
import store from './store'
import setupInterceptors from '@/service/core/interceptor'

import 'primevue/resources/themes/tailwind-light/theme.css'
import 'primevue/resources/primevue.min.css'

import 'primeicons/primeicons.css'
import 'primeflex/primeflex.css'
// import 'primeng/resources/primeng.min.css'
import ToastService from 'primevue/toastservice'
import ConfirmationService from 'primevue/confirmationservice'
import 'material-icons/iconfont/material-icons.css'
import '@/assets/tnsol.css'
import '@/assets/style/popconfirm.css'
import '@/assets/style/toolbar.css'
import '@/assets/style/table.css'
import '@/assets/style/modal.css'
import 'nprogress/nprogress.css'
import CKEditor from '@ckeditor/ckeditor5-vue'

// Modular
import { registerModules } from '@/modules/register'
import Account from '@/modules/setting/account'
import Authority from '@/modules/setting/authority'
import MasterItem from '@/modules/master/item'
import Service from '@/modules/service'
import * as Sentry from '@sentry/vue'
import { Integrations } from '@sentry/tracing'

registerModules({
  accountModule: Account,
  masterItem: MasterItem,
  authorityModule: Authority,
  serviceModule: Service,
})
localStorage.clear()
setupInterceptors()
declare global {
  interface Window {
    Cypress?: any
    app?: any
    store?: any
  }
}
declare var require: any

const app = createApp(App)

app
  .use(PrimeVue)
  .use(store)
  .use(router)
  .use(ToastService)
  .use(ConfirmationService)
  .use(CKEditor)

app.mount('#app')

Sentry.init({
  app,
  dsn: process.env.VUE_APP_SENTRY_DSN,
  integrations: [
    new Integrations.BrowserTracing({
      routingInstrumentation: Sentry.vueRouterInstrumentation(router),
      tracingOrigins: ['localhost', 'horas.com', /^\//],
    }),
  ],
  tracesSampleRate: 1.0,
})

if (window.parent.Cypress) {
  window.store = store
  window.app = app
}
