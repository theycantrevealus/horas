import { isRef, nextTick } from 'vue'
import { createI18n } from 'vue-i18n'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getBrowserLocale(options = {}): any {
  const defaultOptions = { countryCodeOnly: false }

  const opt = { ...defaultOptions, ...options }

  const navigatorLocale =
    navigator.languages !== undefined ? navigator.languages[0] : navigator.language

  if (!navigatorLocale) {
    return undefined
  }

  const trimmedLocale = opt.countryCodeOnly
    ? navigatorLocale.trim().split(/-|_/)[0]
    : navigatorLocale.trim()
  return trimmedLocale
}

import type { I18n, I18nOptions, Locale, VueI18n, Composer, I18nMode } from 'vue-i18n'

export const SUPPORT_LOCALES = ['en', 'ja']

function isComposer(instance: VueI18n | Composer, mode: I18nMode): instance is Composer {
  return mode === 'composition' && isRef(instance.locale)
}

export function getLocale(i18n: I18n): string {
  if (isComposer(i18n.global, i18n.mode)) {
    return i18n.global.locale.value
  } else {
    return i18n.global.locale
  }
}

export function setLocale(i18n: I18n, locale: Locale): void {
  if (isComposer(i18n.global, i18n.mode)) {
    i18n.global.locale.value = locale
  } else {
    i18n.global.locale = locale
  }
}

export function setupI18n(options: I18nOptions = { locale: 'en' }): I18n {
  const i18n = createI18n(options)
  setI18nLanguage(i18n, options.locale!)
  return i18n
}

export function setI18nLanguage(i18n: I18n, locale: Locale): void {
  setLocale(i18n, locale)
  /**
   * NOTE:
   * If you need to specify the language setting for headers, such as the `fetch` API, set it here.
   * The following is an example for axios.
   *
   * axios.defaults.headers.common['Accept-Language'] = locale
   */
  document.querySelector('html')!.setAttribute('lang', locale)
}

export async function loadLocaleMessages(i18n: I18n, locale: Locale, messages = {}) {
  // const getResourceMessages = (r: any) => r.default || r
  // load locale messages
  // const messages = await import(`./locales/${locale}.json`).then(getResourceMessages)

  // set locale and locale message
  i18n.global.setLocaleMessage(locale, messages)

  return nextTick()
}

export const i18n = setupI18n({
  locale: window.navigator.language.toString().substring(0, 2),
  silentTranslationWarn: true,
  fallbackLocale: 'en',
  legacy: true,
  warnHtmlInMessage: 'off',
  globalInjection: true,
})
