import CoreService from '@/service/core/sidemenu'
import getBrowserLocale from "@/util/i18n/browser.config";
import Corei18nService from "@/service/core/i18n";

export const i18nStore = {
  namespaced: true,
  state: {
    language: {},
    languageLib: {},
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
    },
    Getter___getLanguageLib: (state: any) => {
      return state.languageLib
    }
  },
  actions: {
    Action___setLanguange: async ({ commit, state }: { commit: Function, state: any }) => {
      commit('Mutation___setBrowserLanguage', true)
    },
    Action___getLanguage: async({ commit }) => {
      commit('Mutation___initLanguage', await Corei18nService.generatei18n())
    },
    Action___changeLanguage: async ({ commit, state }: { commit: Function, state: any }, data) => {
      commit('Mutation___changeLanguage', data)
    },
  },
  mutations: {
    Mutation___initLanguage: (state: any, data: any[]) => {
      const metaDataLanguage = {}
      const payload = data['payload']
      if(payload) {
        for(const a in payload) {
          const item = payload[a]
          const languageID = item.language_code.toLowerCase()
          if(!metaDataLanguage[item.language_code.toLowerCase()]) {
            metaDataLanguage[languageID] = {}
          }

          // item.components.map((componentData) => {
          //   metaDataLanguage[languageID][componentData.component] = componentData.translation
          // })

          metaDataLanguage[languageID] = item.components.reduce((m, o) => {
            const keys = o.component.split('.');
            let cur = m;
            keys.forEach((key, i) => {
              if (i < keys.length - 1) {
                cur[key] = cur[key] || {};
                cur = cur[key];
              } else {
                cur[key] = o.translation;
              }
            });
            return m;
          }, {})

          metaDataLanguage[languageID].message = {
            hello: `hello world ${languageID}`
          }
        }
      }

      state.languageLib = metaDataLanguage
    },
    Mutation___setBrowserLanguage: (state: any, data: boolean = false) => {
      if(state.language && Object.keys(state.language).length === 0 && Object.getPrototypeOf(state.language) === Object.prototype) {
        const selectedLanguage: string = getBrowserLocale({
          countryCodeOnly: data,
        })

        state.language = state.languageMeta[selectedLanguage]
      }
    },
    Mutation___changeLanguage: (state, data) => {
      state.language = state.languageMeta[data.lang]
    }
  },
}
