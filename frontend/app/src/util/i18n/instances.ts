import { createI18n } from 'vue-i18n'
import store from '@/store/index'

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

const dataSetLanguage = store.getters['storei18n/Getter___getLanguageLib']
const i18n = createI18n({
  locale: 'en',
  fallbackLocale: 'en',
  dataSetLanguage,
})

export { i18n }
