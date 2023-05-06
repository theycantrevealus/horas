import CoreService from '@/service/core/sidemenu'
import getBrowserLocale from "@/util/i18n/browser.config";

export const i18nStore = {
  namespaced: true,
  state: {
    language: {},
    languageMeta: {
      en: {
        code: 'us',
        lang: 'en',
        name: 'United States',
        currency: 'USD',
      },
      id: {
        code: 'id',
        lang: 'id',
        name: 'Indonesia',
        currency: 'IDR',
      },
    },
  },
  getters: {
    Getter___menuData: (state: any) => {
      return state.menuData
    },
    Getter___getLanguage: (state: any) => {
      return state.language
    }
  },
  actions: {
    Action___setLanguange: async ({ commit, state }: { commit: Function, state: any }) => {
      commit('Mutation___setBrowserLanguage', true)
    },
    Action___changeLanguage: async ({ commit, state }: { commit: Function, state: any }) => {
      //
    },
  },
  mutations: {
    Mutation___setBrowserLanguage(state: any, data: boolean = false) {
      const selectedLanguage: string = getBrowserLocale({
        countryCodeOnly: data,
      })
      state.language = state.languageMeta[selectedLanguage]
    },
    Mutation___changeLanguage: (state, data) => {
      state.language = state.languageMeta[data.lang]
    }
  },
}
