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
import '@material-design-icons/font'
import '@material-design-icons/font/outlined.css'
import 'material-symbols'
import '@/assets/tnsol.css'
import '@/assets/flag.css'
import '@/assets/style/popconfirm.css'
import '@/assets/style/toolbar.css'
import '@/assets/style/table.css'
import '@/assets/style/modal.css'
import 'nprogress/nprogress.css'
import CKEditor from '@ckeditor/ckeditor5-vue'
import { registerModules } from '@/modules/register'
import GetStarted from '@/modules/get_started'
import Account from '@/modules/setting/account'
import Authority from '@/modules/setting/authority'
import Corei18n from '@/modules/setting/i18n'
import ApplicationConfiguration from '@/modules/setting/configuration'
import MasterItem from '@/modules/master/item'
import PurchaseOrder from '@/modules/inventory/purchase_order'
import GeneralReceiveNote from '@/modules/inventory/general_receive_note'
import Service from '@/modules/service'
import FrontDesk from '@/modules/front_desk'
import * as Sentry from '@sentry/vue'
import { Integrations } from '@sentry/tracing'
import { createI18n } from 'vue-i18n'
import 'primevue/resources/themes/tailwind-light/theme.css'
import 'primevue/resources/primevue.min.css'
import 'primeicons/primeicons.css'
import 'primeflex/primeflex.css'
import DialogService from 'primevue/dialogservice'
import { i18n } from '@/util/i18n/instances'
import VueSocketIO from 'vue-3-socket.io'
import {io} from "socket.io-client";
import process from 'process'

registerModules({
  getStarted: GetStarted,
  accountModule: Account,
  masterItem: MasterItem,
  authorityModule: Authority,
  corei18N: Corei18n,
  applicationConfiguration: ApplicationConfiguration,
  serviceModule: Service,
  inventory__PurchaseOrder: PurchaseOrder,
  inventory__GeneralReceiveNote: GeneralReceiveNote,
  frontDesk: FrontDesk,
})
// localStorage.clear()
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
  .use(new VueSocketIO({
    debug: true,
    connection: io(process.env.NODE_ENV === "production" ? "http://localhost:9900" : "http://localhost:9900", {
      withCredentials: true,
      auth: {
        token: `Bearer ${store.getters['storeCredential/Getter___token']}`
      },
      extraHeaders: {
        Authorization: `Bearer ${store.getters['storeCredential/Getter___token']}`
      }
    }),
    vuex: {
      store,
      actionPrefix: 'storeSocket/Action___socket_',
    },
  }))
  .use(PrimeVue)
  .use(store)
  .use(router)
  .use(ToastService)
  .use(ConfirmationService)
  .use(CKEditor)
  .use(i18n)
  .use(DialogService)

app.directive('tooltip', Tooltip)

app.mount('#app')

// Sentry.init({
//   app,
//   dsn: process.env.VUE_APP_SENTRY_DSN,
//   integrations: [
//     new Integrations.BrowserTracing({
//       routingInstrumentation: Sentry.vueRouterInstrumentation(router),
//       tracingOrigins: ['localhost', 'horas.com', /^\//],
//     }),
//   ],
//   tracesSampleRate: 1.0,
// })

if (window.parent.Cypress) {
  window.store = store
  window.app = app
}
