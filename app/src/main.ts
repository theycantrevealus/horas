import { createApp } from 'vue'
import App from './App.vue'
import PrimeVue from 'primevue/config'
// import * as Sentry from '@sentry/vue'
// import { Integrations } from '@sentry/tracing'
import './registerServiceWorker'
import router from './router'
import store from './store'
import PerfectScrollbar from 'vue3-perfect-scrollbar'
import setupInterceptors from '@/service/core/interceptor'
import 'vue3-perfect-scrollbar/dist/vue3-perfect-scrollbar.css'

import 'primevue/resources/themes/tailwind-light/theme.css'
import 'primevue/resources/primevue.min.css'

import 'primeicons/primeicons.css'
import 'primeflex/primeflex.css'
import 'primeng/resources/primeng.min.css'
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
import VueGoogleMaps from '@fawmi/vue-google-maps'

// Modular
import { registerModules } from '@/modules/register'
import Account from '@/modules/setting/account'
import Authority from '@/modules/setting/authority'
import Service from '@/modules/service'
import MasterItem from '@/modules/master_item'
import MasterDocumentation from '@/modules/master_documentation'
import * as Sentry from '@sentry/vue'
import { Integrations } from '@sentry/tracing'

registerModules({
  accountModule: Account,
  authorityModule: Authority,
  serviceModule: Service,
  masterItemModule: MasterItem,
  masterTourModule: MasterDocumentation
})

setupInterceptors()
declare global {
  interface Window {
    Cypress?: any;
    __app__?: any;
    __store__?: any;
  }
}

const app = createApp(App)

app.use(PrimeVue)
  .use(store)
  .use(VueGoogleMaps, {
    load: {
      key: 'AIzaSyDQCDEFysw0Bi8mvdWiADAPQ4RbtL8CLzQ'
    }
  })
  .use(router)
  .use(ToastService)
  .use(ConfirmationService)
  .use(PerfectScrollbar)
  .use(CKEditor)

app.mount('#app')

Sentry.init({
  app,
  dsn: process.env.VUE_APP_SENTRY_DSN,
  integrations: [
    new Integrations.BrowserTracing({
      routingInstrumentation: Sentry.vueRouterInstrumentation(router),
      tracingOrigins: ['localhost', 'my-site-url.com', /^\//]
    })
  ],
  tracesSampleRate: 1.0
})

if (window.Cypress) {
  window.__app__ = app
  window.__store__ = store
}
