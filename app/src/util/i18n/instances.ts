import { createI18n } from 'vue-i18n'
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
const i18n = createI18n({
  locale: 'en',
  fallbackLocale: 'en',
  messages,
})

export { i18n }
