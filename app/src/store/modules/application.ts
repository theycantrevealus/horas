import ConfigService from "@/service/core/config";
import CoreService from "@/service/core/sidemenu";

export const ApplicationStore = {
  namespaced: true,
  state: {
    configuration: {},
    language: {
      selected: {},
      metaData: {
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
    ui: {
      theme: {
        dark: false
      },
      sidePanel: {
        mode: true
      },
      sideMenu: []
    },
  },
  getters: {
    Getter___applicationConfig: (state: any) => {
      return state.configuration;
    },
    Getter___sidePanelMode: (state: any):Promise<boolean> => {
      return state.ui.sidePanel.mode
    },
    Getter___sideMenu: (state: any):Promise<any[]> => {
      return state.ui.sideMenu
    },
    Getter___getThemeMode: (state: any):Promise<boolean> => {
      return state.ui.theme.dark
    },
  },
  actions: {
    Action___updateConfiguration: async ({commit}) => {
      await ConfigService.getConfig().then((response) => {
        commit('Mutation___updateConfiguration', response)
      })
    },
    Action___updateMenu: async({ commit }) => {
      await CoreService.generateMenu().then(
        (response: any) => {
          response = response.data
          commit('Mutation___updateMenu', response)
        }
      )
    },
    Action___toggleMenuOn: async({ commit }) => {
      commit('Mutation___toggleSideMenuOn')
    },
    Action___toggleMenuOff: async({ commit }) => {
      commit('Mutation___toggleSideMenuOff')
    },
    Action___toggleDarkMode: async({ commit }) => {
      commit('Mutation___themeDark')
    }
  },
  mutations: {
    Mutation___updateConfiguration: (state, payload) => {
      state.configuration = payload
    },
    Mutation___updateMenu: (state, payload) => {
      state.ui.sideMenu = payload
    },
    Mutation___toggleSideMenuOn: (state) => {
      state.ui.sidePanel.mode = true
    },
    Mutation___toggleSideMenuOff: (state) => {
      state.ui.sidePanel.mode = false
    },
    Mutation___themeDark: (state) => {
      state.ui.theme.dark = !state.ui.theme.dark
    }
  }
};
