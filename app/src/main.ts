import { createApp } from 'vue'
import App from './App.vue'
import PrimeVue from 'primevue/config'
import './registerServiceWorker'
import router from './router'
import store from './store'
import setupInterceptors from '@/service/core/interceptor'
import ToastService from 'primevue/toastservice'
import ConfirmationService from 'primevue/confirmationservice'
import Tooltip from 'primevue/tooltip'
import 'material-icons/iconfont/material-icons.css'
import '@/assets/tnsol.css'
import '@/assets/flag.css'
import '@/assets/style/popconfirm.css'
import '@/assets/style/toolbar.css'
import '@/assets/style/table.css'
import '@/assets/style/modal.css'
import 'nprogress/nprogress.css'
import CKEditor from '@ckeditor/ckeditor5-vue'
import { registerModules } from '@/modules/register'
import New from '@/modules/new'
import GetStarted from '@/modules/get_started'
import Account from '@/modules/setting/account'
import Authority from '@/modules/setting/authority'
import Corei18n from '@/modules/setting/i18n'
import MasterItem from '@/modules/master/item'
import Service from '@/modules/service'
import * as Sentry from '@sentry/vue'
import { Integrations } from '@sentry/tracing'
import { createI18n } from 'vue-i18n'
import 'primevue/resources/themes/tailwind-light/theme.css'
import 'primevue/resources/primevue.min.css'
import 'primeicons/primeicons.css'
import 'primeflex/primeflex.css'
import { i18n } from '@/util/i18n/instances'

registerModules({
  newModule: New,
  getStarted: GetStarted,
  accountModule: Account,
  masterItem: MasterItem,
  authorityModule: Authority,
  corei18N: Corei18n,
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
const messages = {
  en: {
    message: {
      hello: 'hello world',
    },
  },
  id: {
    message: {
      hello: 'こんにちは、世界',
    },
  },
}

const app = createApp(App)

app
  .use(PrimeVue)
  .use(store)
  .use(router)
  .use(ToastService)
  .use(ConfirmationService)
  .use(CKEditor)
  .use(i18n)
app.directive('tooltip', Tooltip)

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
