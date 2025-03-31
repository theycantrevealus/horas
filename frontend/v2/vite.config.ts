import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
// import { resolve, dirname } from 'node:path'
import Components from 'unplugin-vue-components/vite'
import VueI18nPlugin from '@intlify/unplugin-vue-i18n/vite'
import { PrimeVueResolver } from '@primevue/auto-import-resolver'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import vueDevTools from 'vite-plugin-vue-devtools'
// import { createRequire } from 'node:module'
// const require = createRequire(import.meta.url)

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueJsx(),
    vueDevTools(),
    Components({
      resolvers: [PrimeVueResolver()],
    }),
    VueI18nPlugin({
      /* options */
      // locale messages resource pre-compile option
      // include: resolve(dirname(fileURLToPath(import.meta.url)), './path/to/src/locales/**'),
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
