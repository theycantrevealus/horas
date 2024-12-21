import './assets/main.css'
import PrimeVue from 'primevue/config'
import Aura from '@primevue/themes/aura'

import { createApp } from 'vue'
import { createI18n } from 'vue-i18n'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import App from './App.vue'
import router from '@/router'

import 'primeicons/primeicons.css'
import 'primeflex/primeflex.css'
import 'primeflex/themes/primeone-light.css'
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
import { storeCore } from '@/store'

const app = createApp(App)

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

const i18n = createI18n({
  locale: 'en',
  fallbackLocale: 'en',
})

app.use(pinia)
app.use(router)
app.use(i18n)
app.use(PrimeVue, {
  theme: {
    preset: Aura
  }
})
app.mount('#app')
